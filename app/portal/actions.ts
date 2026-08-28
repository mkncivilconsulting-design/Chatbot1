"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  KICH_THUOC_TOI_DA,
  MIME_CHO_PHEP,
  TEN_LOAI,
  docDuocGiTuGiayTo,
  trichXuatGiayTo,
  type LoaiGiayTo,
} from "@/lib/document-extraction";
import {
  hoSoTonTai,
  laMaHoSoHopLe,
  luuFileGoc,
  luuGiayTo,
  taoHoSo,
} from "@/lib/student-profile";
import { isSupabaseConfigured } from "@/lib/supabase-server";

// Cookie chỉ chứa id hồ sơ (UUID). httpOnly nên JavaScript trong trình duyệt
// không đọc được, và bản thân id cũng không cấp quyền gì — mọi truy vấn vẫn
// chạy phía server bằng secret key.
const COOKIE_NAME = "duhoc24_sid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 ngày

const LOAI_HOP_LE: LoaiGiayTo[] = ["bang_diem", "ielts", "giay_to_tuy_than"];

export interface KetQuaNop {
  ok: boolean;
  loi?: string;
}

export async function docMaHoSo(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  return laMaHoSoHopLe(raw) ? raw : null;
}

async function ghiCookieHoSo(id: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function napGiayTo(formData: FormData): Promise<KetQuaNop> {
  if (!isSupabaseConfigured()) {
    console.error("[portal] Thiếu SUPABASE_URL hoặc SUPABASE_SECRET_KEY trong .env");
    return { ok: false, loi: "Hệ thống chưa được cấu hình. Vui lòng liên hệ quản trị viên." };
  }

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

  // Cookie có thể trỏ tới hồ sơ đã bị xoá — khi đó tạo hồ sơ mới.
  let profileId = await docMaHoSo();
  if (profileId && !(await hoSoTonTai(profileId))) profileId = null;
  if (!profileId) {
    profileId = await taoHoSo();
    if (!profileId) {
      return { ok: false, loi: "Không tạo được hồ sơ. Bạn thử lại giúp mình nhé." };
    }
    await ghiCookieHoSo(profileId);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Lưu file gốc trước. Lưu hỏng thì vẫn đọc tiếp — thông tin trích xuất mới là
  // thứ hiển thị cho học viên, không nên mất chỉ vì storage trục trặc.
  const duongDanLuu = await luuFileGoc(profileId, loaiGiayTo, bytes, file.type);

  const trichXuat = await trichXuatGiayTo(loaiGiayTo, bytes, file.type);

  // Đọc được ít nhất một trường thì coi là hợp lệ; không đọc được gì thì yêu cầu nộp lại.
  const docDuoc = trichXuat !== null && docDuocGiTuGiayTo(trichXuat);
  const daLuu = await luuGiayTo(profileId, loaiGiayTo, {
    tenFile: file.name,
    mime: file.type,
    kichThuoc: file.size,
    duongDanLuu,
    trangThai: docDuoc ? "hop_le" : "can_nop_lai",
    lyDo: docDuoc
      ? null
      : "Không đọc được thông tin từ file này. Bạn thử chụp lại rõ nét hơn, đủ sáng và không bị che góc nhé.",
    trichXuat,
  });

  if (!daLuu) {
    return { ok: false, loi: "Đọc được giấy tờ nhưng không lưu được. Bạn thử lại nhé." };
  }

  revalidatePath("/portal");
  return { ok: true };
}
