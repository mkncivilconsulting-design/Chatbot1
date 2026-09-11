import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Đăng nhập dùng PUBLISHABLE key, không phải secret key: client này thay mặt
// người dùng đang đăng nhập. Dữ liệu các bảng vẫn chỉ đọc qua secret key ở
// lib/supabase-server.ts — client này chỉ lo phiên đăng nhập.
// Cả hai biến đều không có tiền tố NEXT_PUBLIC_: mọi thao tác auth chạy phía server.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

export function daCauHinhAuth() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

// Mặc định @supabase/ssr ghi cookie phiên với httpOnly = false để code JavaScript
// phía trình duyệt đọc được. Site này làm mọi thứ về đăng nhập ở server, nên
// bật httpOnly: script lạ chèn vào trang (XSS) cũng không lấy cắp được token.
// proxy.ts dùng chung cấu hình này — hai nơi ghi cookie phải giống hệt nhau.
export const TUY_CHON_COOKIE_AUTH = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

/**
 * Client Supabase Auth đọc/ghi phiên đăng nhập qua cookie.
 *
 * Phải tạo MỚI cho mỗi request (tài liệu @supabase/ssr yêu cầu vậy), nên đây là
 * hàm chứ không phải một biến dùng chung.
 *
 * Trong Server Component, Next không cho ghi cookie — lỗi đó được nuốt đi có chủ
 * ý, vì proxy.ts đã làm mới phiên cho /portal trước khi trang render.
 */
export async function taoClientAuth() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Thiếu SUPABASE_URL hoặc SUPABASE_PUBLISHABLE_KEY trong .env");
  }
  const store = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: TUY_CHON_COOKIE_AUTH,
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        } catch {
          // Đang ở Server Component: không ghi được cookie, bỏ qua.
        }
      },
    },
  });
}

/** Địa chỉ gốc của site, dùng để dựng link trong email đăng nhập. */
export function layDiaChiSite(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
