import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { daCauHinhAuth, taoClientAuth } from "@/lib/supabase-auth";

// DATA ACCESS LAYER cho phiên đăng nhập — theo khuyến nghị trong tài liệu
// xác thực của Next.js: gom việc kiểm tra phiên về MỘT chỗ, và mọi trang lẫn
// Server Action cần dữ liệu riêng tư đều phải đi qua đây.
//
// proxy.ts chỉ chặn "lạc quan" (chuyển hướng sớm cho nhanh). Đây mới là lớp
// kiểm tra thật: getUser() hỏi thẳng máy chủ Auth của Supabase, nên cookie bị
// giả mạo hay token đã bị thu hồi đều không qua được.

export interface NguoiDung {
  id: string;
  email: string | null;
}

/** Người đang đăng nhập, hoặc null. `cache` để một lượt render chỉ hỏi Supabase một lần. */
export const layNguoiDung = cache(async (): Promise<NguoiDung | null> => {
  if (!daCauHinhAuth()) return null;

  const supabase = await taoClientAuth();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email ?? null };
});

/** Bắt buộc đăng nhập; chưa đăng nhập thì chuyển về /login và quay lại đúng trang sau đó. */
export async function batBuocDangNhap(quayVe = "/portal"): Promise<NguoiDung> {
  const nguoiDung = await layNguoiDung();
  if (!nguoiDung) redirect(`/login?next=${encodeURIComponent(quayVe)}`);
  return nguoiDung;
}

// ---------------------------------------------------------------------------
// TRANG QUẢN TRỊ
// ---------------------------------------------------------------------------

export type VaiTro = "admin" | "nhan_vien";

export const TEN_VAI_TRO: Record<VaiTro, string> = {
  admin: "Admin",
  nhan_vien: "Nhân viên",
};

export interface TaiKhoanQuanTri extends NguoiDung {
  vaiTro: VaiTro;
}

/**
 * Vai trò quản trị của người đang đăng nhập, hoặc null nếu chưa đăng nhập /
 * không có vai trò. Đọc bảng tai_khoan_quan_tri qua RLS bằng phiên của chính
 * họ, nên không ai tự nhận vai trò được.
 */
export const layTaiKhoanQuanTri = cache(async (): Promise<TaiKhoanQuanTri | null> => {
  const nguoiDung = await layNguoiDung();
  if (!nguoiDung) return null;

  const db = await taoClientAuth();
  const { data, error } = await db
    .from("tai_khoan_quan_tri")
    .select("vai_tro")
    .eq("user_id", nguoiDung.id)
    .maybeSingle();

  if (error) {
    console.error("[dal] Không đọc được vai trò:", error.message);
    return null;
  }
  if (data?.vai_tro !== "admin" && data?.vai_tro !== "nhan_vien") return null;
  return { ...nguoiDung, vaiTro: data.vai_tro };
});

/**
 * Bắt buộc có vai trò quản trị để xem trang. Mỗi trang /admin gọi hàm này —
 * không dựa vào layout, vì layout không chạy lại khi chuyển trang.
 *
 * Chưa đăng nhập, hoặc đăng nhập mà không có vai trò → về trang đăng nhập quản
 * trị (trang đó tự báo "không có quyền" nếu đã đăng nhập).
 */
export async function batBuocQuanTri(quayVe = "/admin"): Promise<TaiKhoanQuanTri> {
  const taiKhoan = await layTaiKhoanQuanTri();
  if (!taiKhoan) redirect(`/dang-nhap-quan-tri?next=${encodeURIComponent(quayVe)}`);
  return taiKhoan;
}

/**
 * Dùng trong Server Action sửa/xoá: trả về tài khoản nếu là admin, ngược lại
 * null. Đây là lớp chặn thứ nhất; lớp cuối cùng là RLS trong database.
 */
export async function kiemTraAdmin(): Promise<TaiKhoanQuanTri | null> {
  const taiKhoan = await layTaiKhoanQuanTri();
  return taiKhoan?.vaiTro === "admin" ? taiKhoan : null;
}

/**
 * Chỉ chấp nhận đường dẫn nội bộ cho tham số `next`, chặn kiểu tấn công
 * open redirect (`next=https://trang-lua-dao.com` hoặc `next=//trang-lua-dao.com`).
 */
export function duongDanQuayVeAnToan(next: unknown, macDinh = "/portal"): string {
  if (typeof next !== "string") return macDinh;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return macDinh;
  return next;
}
