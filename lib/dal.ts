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

/**
 * Chỉ chấp nhận đường dẫn nội bộ cho tham số `next`, chặn kiểu tấn công
 * open redirect (`next=https://trang-lua-dao.com` hoặc `next=//trang-lua-dao.com`).
 */
export function duongDanQuayVeAnToan(next: unknown, macDinh = "/portal"): string {
  if (typeof next !== "string") return macDinh;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return macDinh;
  return next;
}
