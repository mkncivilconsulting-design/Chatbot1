import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { daCauHinhMatKhau, kiemTraBasicAuth } from "@/lib/admin-auth";

// Ở Next.js 16, file này tên `proxy.ts` — `middleware.ts` đã bị deprecated.
//
// MỤC ĐÍCH: chặn tạm /admin/* cho tới khi có đăng nhập thật ở Tuần 6.
// Trang admin hiển thị hội thoại và thông tin cá nhân của khách. Đây là hàng rào
// tạm, KHÔNG phải hệ thống xác thực:
// - chỉ một mật khẩu dùng chung, không phân biệt người dùng
// - không có phiên đăng nhập, không log ai đã xem gì
// Tuần 6 sẽ thay bằng Supabase Auth + RLS, lúc đó xoá file này.
//
// Server Action gọi từ trang admin cũng POST về chính URL /admin/... nên đi qua
// đây. Dù vậy các action vẫn tự kiểm tra lại quyền — phòng khi matcher đổi.

export const config = {
  // Liệt kê cả "/admin" lẫn "/admin/..." để trang gốc cũng bị chặn.
  matcher: ["/admin", "/admin/:path*"],
};

function yeuCauDangNhap() {
  return new NextResponse("Cần đăng nhập để vào trang quản trị.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="DuHoc24 Admin", charset="UTF-8"',
    },
  });
}

export function proxy(request: NextRequest) {
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
