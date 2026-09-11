import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { daCauHinhAuth, taoClientAuth } from "@/lib/supabase-auth";
import { duongDanQuayVeAnToan } from "@/lib/dal";

// Khách bấm magic link trong email → Supabase xác minh → chuyển về đây.
//
// Nhận được một trong hai dạng:
// - `?code=...`  — luồng PKCE mặc định. Đổi code lấy phiên, cần cookie
//   "code verifier" đã ghi lúc khách yêu cầu link, nên chỉ chạy được trên CÙNG
//   trình duyệt đó.
// - `?token_hash=...&type=email` — nếu mẫu email trong Supabase được đổi sang
//   dạng này thì mở link trên máy khác (ví dụ đọc thư trên điện thoại) vẫn được.
//
// Phiên đăng nhập được ghi vào cookie httpOnly qua taoClientAuth().

const LOAI_OTP: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

function veTrangDangNhap(request: NextRequest, loi: string) {
  const url = new URL("/login", request.nextUrl.origin);
  url.searchParams.set("loi", loi);
  return khongLuuCache(NextResponse.redirect(url));
}

// Phản hồi này mang cookie phiên đăng nhập — không được để CDN nào lưu lại.
function khongLuuCache(res: NextResponse) {
  res.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  return res;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const next = duongDanQuayVeAnToan(q.get("next"));

  if (!daCauHinhAuth()) return veTrangDangNhap(request, "chua_cau_hinh");

  // Supabase tự gắn lỗi vào URL khi link hết hạn hoặc đã dùng rồi.
  const maLoiTuSupabase = q.get("error_code") ?? q.get("error");
  if (maLoiTuSupabase) {
    console.error("[auth/callback] Supabase báo lỗi:", maLoiTuSupabase, q.get("error_description"));
    return veTrangDangNhap(request, "link_het_han");
  }

  const supabase = await taoClientAuth();
  const code = q.get("code");
  const tokenHash = q.get("token_hash");
  const type = q.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession lỗi:", error.code, error.message);
      return veTrangDangNhap(
        request,
        error.code === "pkce_code_verifier_not_found" ? "khac_trinh_duyet" : "link_het_han",
      );
    }
  } else if (tokenHash && type && LOAI_OTP.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      console.error("[auth/callback] verifyOtp lỗi:", error.code, error.message);
      return veTrangDangNhap(request, "link_het_han");
    }
  } else {
    return veTrangDangNhap(request, "link_khong_hop_le");
  }

  return khongLuuCache(NextResponse.redirect(new URL(next, request.nextUrl.origin)));
}
