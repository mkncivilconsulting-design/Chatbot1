// Quy tắc mật khẩu dùng chung cho form (trình duyệt) và Server Action (server).
// Tách riêng vì file "use server" chỉ được export hàm async.

export const MAT_KHAU_TOI_THIEU = 8;

// bcrypt (Supabase dùng) chỉ đọc 72 byte đầu — dài hơn cũng không an toàn hơn.
export const MAT_KHAU_TOI_DA_BYTE = 72;
