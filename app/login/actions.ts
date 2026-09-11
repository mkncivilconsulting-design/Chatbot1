"use server";

import { redirect } from "next/navigation";
import { daCauHinhAuth, layDiaChiSite, taoClientAuth } from "@/lib/supabase-auth";
import { duongDanQuayVeAnToan } from "@/lib/dal";
import { thongTinLienHe } from "@/lib/qna";

export interface KetQuaGuiLink {
  ok: boolean;
  loi?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Gửi magic link tới email. Bấm link trong thư → /auth/callback → đăng nhập xong.
 *
 * Supabase tự tạo tài khoản cho email lần đầu đăng nhập, nên không có bước
 * đăng ký riêng. Không có mật khẩu nào đi qua đây.
 */
export async function guiMagicLink(formData: FormData): Promise<KetQuaGuiLink> {
  if (!daCauHinhAuth()) {
    console.error("[login] Thiếu SUPABASE_URL hoặc SUPABASE_PUBLISHABLE_KEY trong .env");
    return { ok: false, loi: "Chức năng đăng nhập chưa được cấu hình. Vui lòng liên hệ quản trị viên." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, loi: "Email chưa đúng định dạng, bạn kiểm tra lại giúp mình nhé." };
  }

  // `next` đi qua link trong email rồi quay lại callback — lọc ngay từ đầu để
  // không ai dùng trang đăng nhập của mình làm bàn đạp chuyển hướng ra ngoài.
  const next = duongDanQuayVeAnToan(formData.get("next"));
  const emailRedirectTo = `${layDiaChiSite()}/auth/callback?next=${encodeURIComponent(next)}`;

  const supabase = await taoClientAuth();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo, shouldCreateUser: true },
  });

  if (error) {
    // Ghi lỗi thật vào log, còn khách chỉ thấy câu dễ hiểu.
    console.error("[login] signInWithOtp lỗi:", error.status, error.code, error.message);

    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      // Supabase dùng chung mã lỗi cho hai giới hạn khác hẳn nhau:
      // - từng email: phải cách nhau ~60 giây ("...only request this after 21 seconds")
      // - cả dự án: tổng số email gửi mỗi giờ ("email rate limit exceeded") — với
      //   SMTP mặc định của Supabase con số này rất thấp, cả site dùng chung.
      const soGiay = error.message.match(/after (\d+) seconds?/)?.[1];
      if (soGiay) {
        return {
          ok: false,
          loi: `Bạn vừa yêu cầu link. Kiểm tra hộp thư (cả mục Spam), hoặc đợi ${soGiay} giây rồi gửi lại nhé.`,
        };
      }
      return {
        ok: false,
        loi: `Hệ thống đang tạm hết lượt gửi email đăng nhập, không phải do bạn. Bạn thử lại sau khoảng một giờ, hoặc gọi ${thongTinLienHe.dienThoai} để được hỗ trợ nhé.`,
      };
    }
    if (error.code === "email_address_not_authorized") {
      // SMTP mặc định của Supabase chỉ gửi được tới email trong team dự án.
      return {
        ok: false,
        loi: "Hệ thống email đang ở chế độ thử nghiệm nên chưa gửi được tới địa chỉ này. Vui lòng liên hệ trung tâm để được hỗ trợ.",
      };
    }
    return { ok: false, loi: "Chưa gửi được link đăng nhập. Bạn thử lại sau ít phút nhé." };
  }

  return { ok: true };
}

export async function dangXuat() {
  if (daCauHinhAuth()) {
    const supabase = await taoClientAuth();
    await supabase.auth.signOut();
  }
  redirect("/login?da_dang_xuat=1");
}
