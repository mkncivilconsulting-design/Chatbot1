import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { VaiTro } from "@/lib/dal";

// Bảng tai_khoan_quan_tri. Đọc/ghi bằng client của admin đang đăng nhập — RLS
// cho admin quản lý vai trò của người KHÁC, và chặn tự sửa/xoá vai trò của mình.

export interface TaiKhoanNhanSu {
  userId: string;
  email: string;
  vaiTro: VaiTro;
  taoLuc: string;
}

export async function danhSachTaiKhoan(db: SupabaseClient): Promise<TaiKhoanNhanSu[]> {
  const { data, error } = await db
    .from("tai_khoan_quan_tri")
    .select("user_id, email, vai_tro, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin-accounts] Không đọc được danh sách:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    userId: r.user_id as string,
    email: r.email as string,
    vaiTro: r.vai_tro as VaiTro,
    taoLuc: r.created_at as string,
  }));
}

/** Trả về mã lỗi Postgres (nếu có) để phía gọi nói rõ cho admin. */
export async function capVaiTro(
  db: SupabaseClient,
  userId: string,
  email: string,
  vaiTro: VaiTro,
): Promise<{ ok: boolean; maLoi?: string }> {
  const { data, error } = await db
    .from("tai_khoan_quan_tri")
    .insert({ user_id: userId, email, vai_tro: vaiTro })
    .select("user_id");
  if (error) {
    console.error("[admin-accounts] Không cấp được vai trò:", error.code, error.message);
    return { ok: false, maLoi: error.code };
  }
  return { ok: (data?.length ?? 0) > 0 };
}

export async function doiVaiTro(db: SupabaseClient, userId: string, vaiTro: VaiTro): Promise<boolean> {
  const { data, error } = await db
    .from("tai_khoan_quan_tri")
    .update({ vai_tro: vaiTro })
    .eq("user_id", userId)
    .select("user_id");
  if (error) {
    console.error("[admin-accounts] Không đổi được vai trò:", error.code, error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** Gỡ quyền vào trang quản trị. Tài khoản đăng nhập vẫn còn, chỉ mất vai trò. */
export async function goVaiTro(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await db
    .from("tai_khoan_quan_tri")
    .delete()
    .eq("user_id", userId)
    .select("user_id");
  if (error) {
    console.error("[admin-accounts] Không gỡ được vai trò:", error.code, error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}
