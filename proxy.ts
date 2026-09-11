import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { TUY_CHON_COOKIE_AUTH } from "@/lib/supabase-auth";

// Ở Next.js 16, file này tên `proxy.ts` — `middleware.ts` đã bị deprecated.
//
// Làm mới phiên đăng nhập Supabase cho /portal và /admin, và chuyển người chưa
// đăng nhập về trang đăng nhập tương ứng. Đây chỉ là lớp chặn "lạc quan" cho
// nhanh — KHÔNG kiểm tra vai trò ở đây. Lớp kiểm tra thật:
// - từng trang và Server Action gọi lib/dal.ts (đăng nhập + vai trò),
// - RLS trong database chặn đọc/sửa/xoá theo đúng vai trò.

export const config = {
  // Liệt kê cả trang gốc lẫn "/.../..." để trang gốc cũng đi qua proxy.
  matcher: ["/admin", "/admin/:path*", "/portal", "/portal/:path*"],
};

export async function proxy(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  // Thiếu cấu hình thì để trang tự xử lý (nó sẽ chuyển về trang đăng nhập và báo lỗi).
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookieOptions: TUY_CHON_COOKIE_AUTH,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Token vừa được làm mới: ghi vào request để trang render phía sau đọc
        // được ngay, và vào response để trình duyệt lưu lại.
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Header chống cache đi kèm cookie phiên — bắt buộc theo tài liệu @supabase/ssr.
        for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
      },
    },
  });

  // Đừng chèn code nào giữa createServerClient và getUser() — lệnh này mới là
  // chỗ làm mới token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Chỉ chuyển hướng khi MỞ trang (GET). Server Action là POST: để nó tự trả
  // thông báo "hết phiên", thay vì nhận về HTML trang đăng nhập rồi vỡ.
  if (!user && (request.method === "GET" || request.method === "HEAD")) {
    const laQuanTri = request.nextUrl.pathname.startsWith("/admin");
    const dich = new URL(laQuanTri ? "/dang-nhap-quan-tri" : "/login", request.nextUrl.origin);
    dich.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(dich);
  }

  return response;
}
