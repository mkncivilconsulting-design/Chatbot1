import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Ở Next.js 16, file này tên `proxy.ts` — `middleware.ts` đã bị deprecated.
//
// MỤC ĐÍCH: chặn tạm /admin/* cho tới khi có đăng nhập thật ở Tuần 6.
// Trang admin hiển thị hội thoại riêng tư của khách, mà trước đây ai biết URL
// cũng vào đọc được. Đây là hàng rào tạm, KHÔNG phải hệ thống xác thực:
// - chỉ một mật khẩu dùng chung, không phân biệt người dùng
// - không có phiên đăng nhập, không log ai đã xem gì
// Tuần 6 sẽ thay bằng Supabase Auth + RLS, lúc đó xoá file này.

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

/**
 * So sánh theo thời gian gần như hằng số, tránh rò rỉ mật khẩu qua thời gian phản hồi.
 * Vẫn lộ độ dài mật khẩu — chấp nhận được với hàng rào tạm này.
 */
function bangNhau(a: string, b: string) {
  if (a.length !== b.length) return false;
  let khac = 0;
  for (let i = 0; i < a.length; i++) khac |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return khac === 0;
}

export function proxy(request: NextRequest) {
  const matKhau = process.env.ADMIN_PASSWORD;

  // Thiếu cấu hình thì KHOÁ luôn, không mở cửa. Thà admin vào không được
  // còn hơn vô tình để lộ hội thoại của khách.
  if (!matKhau) {
    console.error("[proxy] Thiếu ADMIN_PASSWORD trong .env — đã khoá toàn bộ /admin");
    return new NextResponse(
      "Trang quản trị chưa được cấu hình: thiếu ADMIN_PASSWORD trong .env",
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return yeuCauDangNhap();

  let giaiMa: string;
  try {
    giaiMa = atob(header.slice("Basic ".length));
  } catch {
    return yeuCauDangNhap();
  }

  // Định dạng Basic Auth là "tên:mật khẩu". Bên mình bỏ qua phần tên đăng nhập.
  const dauHai = giaiMa.indexOf(":");
  const nhapVao = dauHai === -1 ? "" : giaiMa.slice(dauHai + 1);

  if (!bangNhau(nhapVao, matKhau)) return yeuCauDangNhap();

  return NextResponse.next();
}
