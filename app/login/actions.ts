"use server";

import { redirect } from "next/navigation";
import { daCauHinhAuth, taoClientAuth } from "@/lib/supabase-auth";
import { duongDanQuayVeAnToan } from "@/lib/dal";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { coYeuCauDaDuyet } from "@/lib/quote-requests";
import { thongTinLienHe } from "@/lib/qna";
import { MAT_KHAU_TOI_DA_BYTE, MAT_KHAU_TOI_THIEU } from "@/lib/mat-khau";

// Đăng nhập bằng email + mật khẩu qua Supabase Auth. Mật khẩu chỉ đi từ form
// thẳng tới Supabase — không ghi log, không lưu ở đâu trong hệ thống của mình.

export interface KetQuaDangNhap {
  ok: boolean;
  loi?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CHUA_CAU_HINH = "Chức năng đăng nhập chưa được cấu hình. Vui lòng liên hệ quản trị viên.";

function docEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  return EMAIL_RE.test(email) && email.length <= 254 ? email : null;
}

function loiQuaNhieuLan(status: number | undefined) {
  return status === 429
    ? "Bạn thử quá nhiều lần. Đợi vài phút rồi thử lại nhé."
    : null;
}

export async function dangNhap(formData: FormData): Promise<KetQuaDangNhap> {
  if (!daCauHinhAuth()) return { ok: false, loi: CHUA_CAU_HINH };

  const email = docEmail(formData);
  const matKhau = String(formData.get("matKhau") ?? "");
  if (!email) return { ok: false, loi: "Email chưa đúng định dạng, bạn kiểm tra lại giúp mình nhé." };
  if (!matKhau) return { ok: false, loi: "Bạn chưa nhập mật khẩu." };

  const supabase = await taoClientAuth();
  const { error } = await supabase.auth.signInWithPassword({ email, password: matKhau });

  if (error) {
    // Chỉ log mã lỗi, không bao giờ log mật khẩu.
    console.error("[login] signInWithPassword lỗi:", error.status, error.code);
    return {
      ok: false,
      // Không nói rõ sai email hay sai mật khẩu, để người lạ không dò được
      // email nào đã có tài khoản.
      loi: loiQuaNhieuLan(error.status) ?? "Email hoặc mật khẩu không đúng.",
    };
  }

  redirect(duongDanQuayVeAnToan(formData.get("next")));
}

/**
 * Tạo tài khoản cổng hồ sơ.
 *
 * Chỉ email đã có yêu cầu báo giá ĐƯỢC DUYỆT mới tạo được — cổng hồ sơ dành cho
 * khách đã được mời, không phải ai ghé qua cũng mở tài khoản.
 *
 * Tài khoản được tạo phía server bằng secret key và đánh dấu sẵn là đã xác nhận
 * email, nên không cần gửi thư xác nhận (SMTP mặc định của Supabase gửi được rất
 * ít thư mỗi giờ). Đổi lại, hệ thống không kiểm chứng được người tạo tài khoản
 * có thật sự sở hữu email đó — khi có SMTP riêng nên chuyển sang gửi thư xác nhận.
 */
export async function taoTaiKhoan(formData: FormData): Promise<KetQuaDangNhap> {
  const admin = getSupabaseAdmin();
  if (!daCauHinhAuth() || !admin) return { ok: false, loi: CHUA_CAU_HINH };

  const email = docEmail(formData);
  const matKhau = String(formData.get("matKhau") ?? "");
  const nhapLai = String(formData.get("nhapLai") ?? "");

  if (!email) return { ok: false, loi: "Email chưa đúng định dạng, bạn kiểm tra lại giúp mình nhé." };
  if (matKhau.length < MAT_KHAU_TOI_THIEU) {
    return { ok: false, loi: `Mật khẩu cần ít nhất ${MAT_KHAU_TOI_THIEU} ký tự.` };
  }
  if (new TextEncoder().encode(matKhau).length > MAT_KHAU_TOI_DA_BYTE) {
    return { ok: false, loi: "Mật khẩu quá dài, bạn chọn mật khẩu ngắn hơn nhé." };
  }
  if (matKhau !== nhapLai) return { ok: false, loi: "Hai lần nhập mật khẩu chưa khớp nhau." };

  if (!(await coYeuCauDaDuyet(email))) {
    return {
      ok: false,
      loi: `Email này chưa có yêu cầu báo giá được duyệt. Bạn dùng đúng email đã gửi yêu cầu báo giá, hoặc gọi ${thongTinLienHe.dienThoai} để được hỗ trợ nhé.`,
    };
  }

  const { error: loiTao } = await admin.auth.admin.createUser({
    email,
    password: matKhau,
    email_confirm: true,
  });

  if (loiTao) {
    console.error("[login] createUser lỗi:", loiTao.status, loiTao.code);
    if (loiTao.code === "email_exists" || loiTao.status === 422) {
      return {
        ok: false,
        loi: `Email này đã có tài khoản. Bạn chuyển sang "Đăng nhập", hoặc gọi ${thongTinLienHe.dienThoai} nếu quên mật khẩu nhé.`,
      };
    }
    if (loiTao.code === "weak_password") {
      return { ok: false, loi: "Mật khẩu quá dễ đoán, bạn chọn mật khẩu khác nhé." };
    }
    return { ok: false, loi: "Chưa tạo được tài khoản. Bạn thử lại sau ít phút nhé." };
  }

  // Tạo xong thì đăng nhập luôn, khỏi bắt khách gõ lại.
  const supabase = await taoClientAuth();
  const { error: loiDangNhap } = await supabase.auth.signInWithPassword({ email, password: matKhau });
  if (loiDangNhap) {
    console.error("[login] Đăng nhập sau khi tạo tài khoản lỗi:", loiDangNhap.status, loiDangNhap.code);
    return { ok: false, loi: 'Đã tạo tài khoản. Bạn chuyển sang "Đăng nhập" để vào cổng hồ sơ nhé.' };
  }

  redirect(duongDanQuayVeAnToan(formData.get("next")));
}

export async function dangXuat() {
  if (daCauHinhAuth()) {
    const supabase = await taoClientAuth();
    await supabase.auth.signOut();
  }
  redirect("/login?da_dang_xuat=1");
}
