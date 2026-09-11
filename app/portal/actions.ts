"use server";

import { revalidatePath } from "next/cache";
import {
  KICH_THUOC_TOI_DA,
  MIME_CHO_PHEP,
  TEN_LOAI,
  docDuocGiTuGiayTo,
  thieuTruongNao,
  trichXuatGiayTo,
  type LoaiGiayTo,
} from "@/lib/document-extraction";
import { docMaHoSoCu, layHoSoCuaNguoiDung, luuFileGoc, luuGiayTo } from "@/lib/student-profile";
import { isSupabaseConfigured } from "@/lib/supabase-server";
import { layNguoiDung } from "@/lib/dal";
import { doiChieuHoSo } from "@/lib/portal-matching";
import { goiYHocBong, luuGoiY } from "@/lib/scholarship-advisor";

// Mọi export trong file "use server" đều thành endpoint gọi được từ trình duyệt,
// nên file này CHỈ export các action — và action nào cũng tự kiểm tra đăng nhập,
// không dựa vào việc proxy.ts đã chặn /portal (tài liệu Next.js dặn đúng như vậy).

const LOAI_HOP_LE: LoaiGiayTo[] = ["bang_diem", "ielts", "giay_to_tuy_than"];

const HET_PHIEN = "Phiên đăng nhập đã hết. Bạn tải lại trang và đăng nhập lại nhé.";

export interface KetQuaNop {
  ok: boolean;
  loi?: string;
}

export async function napGiayTo(formData: FormData): Promise<KetQuaNop> {
  if (!isSupabaseConfigured()) {
    console.error("[portal] Thiếu SUPABASE_URL hoặc SUPABASE_SECRET_KEY trong .env");
    return { ok: false, loi: "Hệ thống chưa được cấu hình. Vui lòng liên hệ quản trị viên." };
  }

  const nguoiDung = await layNguoiDung();
  if (!nguoiDung) return { ok: false, loi: HET_PHIEN };

  const loai = formData.get("loai");
  if (typeof loai !== "string" || !LOAI_HOP_LE.includes(loai as LoaiGiayTo)) {
    return { ok: false, loi: "Loại giấy tờ không hợp lệ." };
  }
  const loaiGiayTo = loai as LoaiGiayTo;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, loi: "Bạn chưa chọn file." };
  }
  if (file.size > KICH_THUOC_TOI_DA) {
    return { ok: false, loi: "File quá lớn, tối đa 10MB bạn nhé." };
  }
  if (!MIME_CHO_PHEP[loaiGiayTo].includes(file.type)) {
    const mong =
      loaiGiayTo === "bang_diem" ? "file PDF" : "ảnh JPG, PNG hoặc WEBP";
    return { ok: false, loi: `${TEN_LOAI[loaiGiayTo]} cần ${mong}.` };
  }

  // Hồ sơ gắn với TÀI KHOẢN đã xác thực. Lần đầu nộp thì tạo mới (hoặc nhận lại
  // hồ sơ ẩn danh cũ trên trình duyệt này, để giấy tờ đã nộp trước kia không mất).
  const profileId = await layHoSoCuaNguoiDung(nguoiDung.id, {
    maHoSoCu: await docMaHoSoCu(),
    taoMoi: true,
  });
  if (!profileId) {
    return { ok: false, loi: "Không tạo được hồ sơ. Bạn thử lại giúp mình nhé." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Lưu file gốc trước. Lưu hỏng thì vẫn đọc tiếp — thông tin trích xuất mới là
  // thứ hiển thị cho học viên, không nên mất chỉ vì storage trục trặc.
  const duongDanLuu = await luuFileGoc(profileId, loaiGiayTo, bytes, file.type);

  const trichXuat = await trichXuatGiayTo(loaiGiayTo, bytes, file.type);

  // Giấy tờ chỉ "hợp lệ" khi đọc được ĐỦ các trường bắt buộc. Đọc được vài trường
  // mà thiếu trường quan trọng (ví dụ CCCD bị che mất số thẻ) thì vẫn phải nộp lại,
  // và phải nói rõ thiếu trường nào để khách biết đường sửa.
  const docDuocGiDo = trichXuat !== null && docDuocGiTuGiayTo(trichXuat);
  const thieu = trichXuat === null ? [] : thieuTruongNao(loaiGiayTo, trichXuat);
  const dat = docDuocGiDo && thieu.length === 0;

  let lyDo: string | null = null;
  if (!docDuocGiDo) {
    lyDo =
      "Không đọc được thông tin nào từ file này. Bạn thử chụp lại rõ nét hơn, đủ sáng, chụp thẳng và lấy trọn giấy tờ trong khung nhé.";
  } else if (thieu.length > 0) {
    lyDo = `Chưa đọc được ${thieu.join(" và ")}. Phần này có thể bị che, bị làm mờ hoặc loá sáng — bạn chụp lại sao cho nhìn rõ ${thieu.join(" và ")} giúp mình nhé.`;
  }

  const daLuu = await luuGiayTo(profileId, loaiGiayTo, {
    tenFile: file.name,
    mime: file.type,
    kichThuoc: file.size,
    duongDanLuu,
    trangThai: dat ? "hop_le" : "can_nop_lai",
    lyDo,
    trichXuat,
  });

  if (!daLuu) {
    return { ok: false, loi: "Đọc được giấy tờ nhưng không lưu được. Bạn thử lại nhé." };
  }

  revalidatePath("/portal");
  return { ok: true };
}

export interface KetQuaGoiY {
  ok: boolean;
  loi?: string;
}

/**
 * Nhờ Gemini tra cứu và gợi ý học bổng.
 *
 * Hàm này KHÔNG nhận điểm hay danh sách trường từ client — nó đọc hồ sơ của
 * tài khoản đang đăng nhập rồi tự đối chiếu lại, để khách không thể tự khai điểm cao.
 */
export async function timHocBongPhuHop(): Promise<KetQuaGoiY> {
  if (!isSupabaseConfigured()) {
    return { ok: false, loi: "Hệ thống chưa được cấu hình. Vui lòng liên hệ quản trị viên." };
  }

  const nguoiDung = await layNguoiDung();
  if (!nguoiDung) return { ok: false, loi: HET_PHIEN };

  const profileId = await layHoSoCuaNguoiDung(nguoiDung.id);
  if (!profileId) {
    return { ok: false, loi: "Chưa có hồ sơ. Bạn nộp giấy tờ trước nhé." };
  }

  const ket = await doiChieuHoSo(profileId);
  if (!ket.daDuDiem) {
    return { ok: false, loi: "Cần nộp cả bảng điểm và chứng chỉ IELTS trước đã bạn nhé." };
  }
  if (ket.truongDat.length === 0) {
    return {
      ok: false,
      loi: "Hiện chưa có trường nào bạn đạt điểm chuẩn, nên chưa tra cứu học bổng được.",
    };
  }

  const goiY = await goiYHocBong({
    gpa: ket.gpa,
    ielts: ket.ielts,
    truongDat: ket.truongDat,
  });
  if (!goiY) {
    return { ok: false, loi: "Chưa tra cứu được học bổng, bạn thử lại sau ít phút nhé." };
  }

  const daLuu = await luuGoiY(profileId, goiY, ket.truongDat.length);
  if (!daLuu) {
    return { ok: false, loi: "Tra cứu xong nhưng không lưu được kết quả. Bạn thử lại nhé." };
  }

  revalidatePath("/portal");
  return { ok: true };
}
