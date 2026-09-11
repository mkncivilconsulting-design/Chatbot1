import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { docGiayTo, type GiayToDaNop } from "@/lib/student-profile";
import type { LoaiGiayTo, TrichXuatBangDiem, TrichXuatGiayTo } from "@/lib/document-extraction";
import type { DocStatus } from "@/lib/mock-data";

// Hồ sơ học viên cho TRANG QUẢN TRỊ. Mọi hàm nhận `db` là client của nhân sự
// đang đăng nhập: RLS cho admin lẫn nhân viên xem, nhưng chỉ admin sửa/xoá được.
// Sửa/xoá bị RLS chặn thì Postgres không báo lỗi mà chỉ lọc mất dòng — nên các
// hàm ghi đều đếm số dòng thực sự bị đổi.

const BUCKET = "ho-so";

export interface HoSoTomTat {
  id: string;
  email: string | null;
  hoTen: string | null;
  capNhatLuc: string;
  giayTo: Partial<Record<LoaiGiayTo, DocStatus>>;
}

export interface HoSoChiTiet {
  id: string;
  email: string | null;
  taoLuc: string;
  capNhatLuc: string;
  giayTo: GiayToDaNop[];
}

export async function danhSachHoSo(db: SupabaseClient, limit = 100): Promise<HoSoTomTat[]> {
  const { data, error } = await db
    .from("student_profiles")
    .select("id, email, updated_at, student_documents(loai, trang_thai, trich_xuat)")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin-profiles] Không đọc được danh sách hồ sơ:", error.message);
    return [];
  }

  return (data ?? []).map((r) => {
    const docs = (r.student_documents ?? []) as {
      loai: LoaiGiayTo;
      trang_thai: DocStatus;
      trich_xuat: unknown;
    }[];
    const tim = (loai: LoaiGiayTo) => docs.find((d) => d.loai === loai)?.trich_xuat;
    const hoTen =
      (tim("bang_diem") as TrichXuatBangDiem | undefined)?.hoTen ??
      (tim("giay_to_tuy_than") as TrichXuatGiayTo | undefined)?.hoTen ??
      null;
    return {
      id: r.id as string,
      email: (r.email as string | null) ?? null,
      hoTen,
      capNhatLuc: r.updated_at as string,
      giayTo: Object.fromEntries(docs.map((d) => [d.loai, d.trang_thai])),
    };
  });
}

export async function chiTietHoSo(db: SupabaseClient, id: string): Promise<HoSoChiTiet | null> {
  const { data, error } = await db
    .from("student_profiles")
    .select("id, email, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin-profiles] Không đọc được hồ sơ:", error.message);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id as string,
    email: (data.email as string | null) ?? null,
    taoLuc: data.created_at as string,
    capNhatLuc: data.updated_at as string,
    giayTo: await docGiayTo(db, id),
  };
}

/** Admin duyệt một giấy tờ: chỉ đổi được trạng thái và lý do (quyền cột trong DB). */
export async function duyetGiayTo(
  db: SupabaseClient,
  profileId: string,
  loai: LoaiGiayTo,
  trangThai: DocStatus,
  lyDo: string | null,
): Promise<boolean> {
  const { data, error } = await db
    .from("student_documents")
    .update({ trang_thai: trangThai, ly_do: lyDo })
    .eq("profile_id", profileId)
    .eq("loai", loai)
    .select("id");

  if (error) {
    console.error("[admin-profiles] Không cập nhật được giấy tờ:", error.code, error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/**
 * Xoá một giấy tờ. Xoá dòng trong database bằng client của người đăng nhập
 * (RLS quyết định có được xoá không), CHỈ KHI xoá được mới dọn file gốc trong
 * storage bằng secret key — nên nhân viên không thể mượn bước dọn file để xoá.
 */
export async function xoaGiayTo(
  db: SupabaseClient,
  profileId: string,
  loai: LoaiGiayTo,
): Promise<boolean> {
  const { data, error } = await db
    .from("student_documents")
    .delete()
    .eq("profile_id", profileId)
    .eq("loai", loai)
    .select("duong_dan_luu");

  if (error) {
    console.error("[admin-profiles] Không xoá được giấy tờ:", error.code, error.message);
    return false;
  }
  if (!data || data.length === 0) return false;

  const duongDan = data.map((d) => d.duong_dan_luu as string | null).filter((p): p is string => !!p);
  await donFile(duongDan);
  return true;
}

/** Xoá cả hồ sơ (giấy tờ đi theo nhờ ON DELETE CASCADE), rồi dọn file gốc. */
export async function xoaHoSo(db: SupabaseClient, profileId: string): Promise<boolean> {
  const { data, error } = await db
    .from("student_profiles")
    .delete()
    .eq("id", profileId)
    .select("id");

  if (error) {
    console.error("[admin-profiles] Không xoá được hồ sơ:", error.code, error.message);
    return false;
  }
  if (!data || data.length === 0) return false;

  const admin = getSupabaseAdmin();
  const { data: files } = admin ? await admin.storage.from(BUCKET).list(profileId) : { data: null };
  await donFile((files ?? []).map((f) => `${profileId}/${f.name}`));
  return true;
}

async function donFile(duongDan: string[]) {
  const admin = getSupabaseAdmin();
  if (!admin || duongDan.length === 0) return;
  const { error } = await admin.storage.from(BUCKET).remove(duongDan);
  // Không làm hỏng thao tác xoá: dữ liệu đã xoá rồi, chỉ còn file mồ côi.
  if (error) console.error("[admin-profiles] Không dọn được file gốc:", error.message);
}
