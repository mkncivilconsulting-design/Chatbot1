import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { daCauHinhMatKhau, kiemTraBasicAuth } from "@/lib/admin-auth";
import { TUY_CHON_COOKIE_AUTH } from "@/lib/supabase-auth";

// Ở Next.js 16, file này tên `proxy.ts` — `middleware.ts` đã bị deprecated.
//
// Hai việc, tách theo đường dẫn:
//
// 1) /portal/* — làm mới phiên đăng nhập Supabase (magic link) và chuyển khách
//    chưa đăng nhập về /login. Đây chỉ là lớp chặn "lạc quan" cho nhanh; trang
//    và Server Action của /portal vẫn tự kiểm tra lại qua lib/dal.ts.
//
// 2) /admin/* — hàng rào Basic Auth tạm, KHÔNG phải hệ thống xác thực:
//    - chỉ một mật khẩu dùng chung, không phân biệt người dùng
//    - không có phiên đăng nhập, không log ai đã xem gì
//    Server Action gọi từ trang admin cũng POST về chính URL /admin/... nên đi
//    qua đây. Dù vậy các action vẫn tự kiểm tra lại quyền — phòng khi matcher đổi.

export const config = {
  // Liệt kê cả trang gốc lẫn "/.../..." để trang gốc cũng đi qua proxy.
  matcher: ["/admin", "/admin/:path*", "/portal", "/portal/:path*"],
};

function yeuCauDangNhap() {
  return new NextResponse("Cần đăng nhập để vào trang quản trị.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="DuHoc24 Admin", charset="UTF-8"',
    },
  });
}

async function chanCongHoSo(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  // Thiếu cấu hình thì để trang tự xử lý (nó sẽ chuyển về /login và báo lỗi).
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

  // Chỉ chuyển hướng khi khách MỞ trang (GET). Server Action là POST: để nó tự
  // trả thông báo "hết phiên", thay vì nhận về HTML trang đăng nhập rồi vỡ.
  if (!user && (request.method === "GET" || request.method === "HEAD")) {
    const dich = new URL("/login", request.nextUrl.origin);
    dich.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(dich);
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    return chanCongHoSo(request);
  }

  // Thiếu cấu hình thì KHOÁ luôn, không mở cửa. Thà admin vào không được
  // còn hơn vô tình để lộ dữ liệu của khách.
  if (!daCauHinhMatKhau()) {
    console.error("[proxy] Thiếu ADMIN_PASSWORD trong .env — đã khoá toàn bộ /admin");
    return new NextResponse(
      "Trang quản trị chưa được cấu hình: thiếu ADMIN_PASSWORD trong .env",
      { status: 503 },
    );
  }

  if (!kiemTraBasicAuth(request.headers.get("authorization"))) {
    return yeuCauDangNhap();
  }

  return NextResponse.next();
}
