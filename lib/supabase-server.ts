// Import này là chốt chặn build-time: nếu có file client component nào lỡ import
// module này, `next build` sẽ BÁO LỖI thay vì âm thầm nhét secret key vào bundle.
import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cả hai biến đều KHÔNG có tiền tố NEXT_PUBLIC_ — cố ý như vậy.
// Next.js chỉ nhúng biến NEXT_PUBLIC_* vào bundle trình duyệt, nên hai biến này
// không bao giờ rời khỏi server.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

let cached: SupabaseClient | null = null;

/**
 * Client Supabase dùng secret key (service_role). Key này BỎ QUA RLS, nên chỉ
 * được gọi từ Route Handler hoặc Server Component — không bao giờ từ trình duyệt.
 *
 * Trả về null khi thiếu biến môi trường, để phía gọi tự quyết định báo lỗi thế nào
 * thay vì làm sập cả trang.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return null;
  if (cached) return cached;

  cached = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      // Không có người dùng đăng nhập ở đây, cũng không cần lưu/refresh session.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SECRET_KEY);
}
