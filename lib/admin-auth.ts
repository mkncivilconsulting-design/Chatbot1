// Kiểm tra mật khẩu admin. Dùng chung cho proxy.ts (chạy ở edge runtime) và
// các Server Action trong /admin (chạy ở node), để hai nơi không lệch logic.
//
// KHÔNG import "server-only" ở đây: file chạy cả trong edge runtime. Cũng không
// có gì để lộ — ADMIN_PASSWORD không có tiền tố NEXT_PUBLIC_ nên Next không bao
// giờ nhúng nó vào bundle trình duyệt.

/**
 * So sánh theo thời gian gần như hằng số, tránh rò rỉ mật khẩu qua thời gian
 * phản hồi. Vẫn lộ độ dài — chấp nhận được với hàng rào tạm này.
 */
function bangNhau(a: string, b: string) {
  if (a.length !== b.length) return false;
  let khac = 0;
  for (let i = 0; i < a.length; i++) khac |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return khac === 0;
}

/** Có cấu hình mật khẩu chưa. Chưa có thì mọi thứ trong /admin phải bị khoá. */
export function daCauHinhMatKhau() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

/**
 * Kiểm tra header Authorization dạng Basic. Trả về false trong mọi trường hợp
 * không chắc chắn, kể cả khi chưa cấu hình ADMIN_PASSWORD.
 */
export function kiemTraBasicAuth(header: string | null | undefined): boolean {
  const matKhau = process.env.ADMIN_PASSWORD;
  if (!matKhau) return false;
  if (!header || !header.startsWith("Basic ")) return false;

  let giaiMa: string;
  try {
    giaiMa = atob(header.slice("Basic ".length));
  } catch {
    return false;
  }

  // Định dạng Basic Auth là "tên:mật khẩu". Có đặt ADMIN_USERNAME thì kiểm tra
  // cả tên; để trống thì chỉ kiểm tra mật khẩu, tên gõ gì cũng được.
  const dauHai = giaiMa.indexOf(":");
  if (dauHai === -1) return false;
  const tenNhap = giaiMa.slice(0, dauHai);
  const matKhauNhap = giaiMa.slice(dauHai + 1);

  const ten = process.env.ADMIN_USERNAME;
  // Tính cả hai phép so sánh rồi mới kết hợp, để thời gian phản hồi không lộ
  // là sai tên hay sai mật khẩu.
  const dungTen = ten ? bangNhau(tenNhap, ten) : true;
  const dungMatKhau = bangNhau(matKhauNhap, matKhau);
  return dungTen && dungMatKhau;
}
