"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { kiemTraAdmin } from "@/lib/dal";
import { taoClientAuth } from "@/lib/supabase-auth";
import { duyetGiayTo, xoaGiayTo, xoaHoSo } from "@/lib/admin-profiles";
import { laMaHoSoHopLe } from "@/lib/student-profile";
import type { LoaiGiayTo } from "@/lib/document-extraction";
import type { DocStatus } from "@/lib/mock-data";

// Mọi action ở đây là thao tác GHI → CHỈ ADMIN. Hai lớp chặn: kiểm tra vai trò
// ngay đầu hàm, và câu lệnh chạy bằng phiên của người đăng nhập nên RLS trong
// database chặn tiếp nếu không phải admin.

export interface KetQuaThaoTac {
  ok: boolean;
  loi?: string;
}

const CHI_ADMIN = "Chỉ admin mới được thực hiện thao tác này.";
const LOAI: LoaiGiayTo[] = ["bang_diem", "ielts", "giay_to_tuy_than"];
// Admin chỉ chốt kết quả duyệt: hợp lệ hoặc yêu cầu nộp lại.
const TRANG_THAI_DUYET: DocStatus[] = ["hop_le", "can_nop_lai"];

function langMoi(profileId: string) {
  revalidatePath(`/admin/profiles/${profileId}`);
  revalidatePath("/admin/profiles");
  // Học viên cũng thấy ngay kết quả duyệt trong cổng hồ sơ.
  revalidatePath("/portal");
}

export async function duyetGiayToAction(
  profileId: string,
  loai: LoaiGiayTo,
  formData: FormData,
): Promise<KetQuaThaoTac> {
  if (!(await kiemTraAdmin())) return { ok: false, loi: CHI_ADMIN };
  if (!laMaHoSoHopLe(profileId) || !LOAI.includes(loai)) {
    return { ok: false, loi: "Giấy tờ không hợp lệ." };
  }

  const trangThai = String(formData.get("trangThai") ?? "") as DocStatus;
  if (!TRANG_THAI_DUYET.includes(trangThai)) return { ok: false, loi: "Trạng thái không hợp lệ." };

  const lyDo = String(formData.get("lyDo") ?? "").trim().slice(0, 1000) || null;
  if (trangThai === "can_nop_lai" && !lyDo) {
    return { ok: false, loi: "Yêu cầu nộp lại thì cần ghi lý do để học viên biết đường sửa." };
  }

  const ok = await duyetGiayTo(
    await taoClientAuth(),
    profileId,
    loai,
    trangThai,
    trangThai === "hop_le" ? null : lyDo,
  );
  if (!ok) return { ok: false, loi: "Không cập nhật được giấy tờ, bạn thử lại nhé." };

  langMoi(profileId);
  return { ok: true };
}

export async function xoaGiayToAction(profileId: string, loai: LoaiGiayTo): Promise<KetQuaThaoTac> {
  if (!(await kiemTraAdmin())) return { ok: false, loi: CHI_ADMIN };
  if (!laMaHoSoHopLe(profileId) || !LOAI.includes(loai)) {
    return { ok: false, loi: "Giấy tờ không hợp lệ." };
  }

  if (!(await xoaGiayTo(await taoClientAuth(), profileId, loai))) {
    return { ok: false, loi: "Không xoá được giấy tờ, bạn thử lại nhé." };
  }
  langMoi(profileId);
  return { ok: true };
}

export async function xoaHoSoAction(profileId: string): Promise<KetQuaThaoTac> {
  if (!(await kiemTraAdmin())) return { ok: false, loi: CHI_ADMIN };
  if (!laMaHoSoHopLe(profileId)) return { ok: false, loi: "Hồ sơ không hợp lệ." };

  if (!(await xoaHoSo(await taoClientAuth(), profileId))) {
    return { ok: false, loi: "Không xoá được hồ sơ, bạn thử lại nhé." };
  }
  langMoi(profileId);
  redirect("/admin/profiles");
}
