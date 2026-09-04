"use server";

import { countries, servicePackages, type ServicePackage } from "@/lib/mock-data";
import { luuYeuCauBaoGia, type BacHoc } from "@/lib/quote-requests";
import { isSupabaseConfigured } from "@/lib/supabase-server";

export interface KetQuaGuiYeuCau {
  ok: boolean;
  loi?: string;
  /** Giá do SERVER chốt, để phần hiển thị kết quả dùng đúng con số đã lưu. */
  gia?: number;
}

const BAC_HOC_HOP_LE: BacHoc[] = ["thpt", "dai_hoc", "thac_si"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function chuoi(v: FormDataEntryValue | null, toiDa: number): string {
  return typeof v === "string" ? v.trim().slice(0, toiDa) : "";
}

/**
 * Lưu yêu cầu báo giá từ form ở trang chủ.
 *
 * GIÁ được tra lại từ bảng gói dịch vụ phía server, KHÔNG lấy từ form — nếu tin
 * client thì khách có thể tự sửa giá thành 0 trước khi gửi.
 */
export async function guiYeuCauBaoGia(formData: FormData): Promise<KetQuaGuiYeuCau> {
  if (!isSupabaseConfigured()) {
    console.error("[quote] Thiếu SUPABASE_URL hoặc SUPABASE_SECRET_KEY trong .env");
    return { ok: false, loi: "Hệ thống chưa sẵn sàng. Bạn thử lại sau ít phút nhé." };
  }

  const tenKhach = chuoi(formData.get("tenKhach"), 120);
  const email = chuoi(formData.get("email"), 200);
  const soDienThoai = chuoi(formData.get("soDienThoai"), 30) || null;
  const quocGia = chuoi(formData.get("quocGia"), 60);
  const bacHocRaw = chuoi(formData.get("bacHoc"), 20);
  const goiRaw = chuoi(formData.get("goiDichVu"), 20);

  if (!tenKhach) return { ok: false, loi: "Bạn cho mình xin họ tên nhé." };
  if (!EMAIL_RE.test(email)) return { ok: false, loi: "Email chưa đúng định dạng." };
  if (!quocGia || !(countries as readonly string[]).includes(quocGia)) {
    return { ok: false, loi: "Bạn chọn quốc gia muốn du học nhé." };
  }
  if (!BAC_HOC_HOP_LE.includes(bacHocRaw as BacHoc)) {
    return { ok: false, loi: "Bậc học không hợp lệ." };
  }

  const goi = servicePackages.find((p) => p.id === goiRaw);
  if (!goi) return { ok: false, loi: "Gói dịch vụ không hợp lệ." };

  const daLuu = await luuYeuCauBaoGia({
    tenKhach,
    email,
    soDienThoai,
    quocGia,
    bacHoc: bacHocRaw as BacHoc,
    goiDichVu: goi.id as ServicePackage,
    gia: goi.price,
  });

  if (!daLuu) {
    return { ok: false, loi: "Không gửi được yêu cầu. Bạn thử lại giúp mình nhé." };
  }

  return { ok: true, gia: goi.price };
}
