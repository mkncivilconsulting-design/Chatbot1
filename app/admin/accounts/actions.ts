"use server";

import { revalidatePath } from "next/cache";
import { kiemTraAdmin, type VaiTro } from "@/lib/dal";
import { taoClientAuth } from "@/lib/supabase-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { capVaiTro, doiVaiTro, goVaiTro } from "@/lib/admin-accounts";
import { MAT_KHAU_TOI_DA_BYTE, MAT_KHAU_TOI_THIEU } from "@/lib/mat-khau";

// Quản lý tài khoản trang quản trị — CHỈ ADMIN.
//
// Tạo tài khoản đăng nhập mới bắt buộc dùng secret key (API admin của Supabase
// Auth). Vì vậy action kiểm tra vai trò admin TRƯỚC khi đụng tới secret key, còn
// bước cấp vai trò thì chạy bằng phiên của admin để RLS chặn thêm một lớp.

export interface KetQuaThaoTac {
  ok: boolean;
  loi?: string;
  thongBao?: string;
}

const CHI_ADMIN = "Chỉ admin mới được quản lý tài khoản.";
const VAI_TRO: VaiTro[] = ["admin", "nhan_vien"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Thêm một người vào trang quản trị với vai trò đã chọn.
 * - Email đã có tài khoản đăng nhập → chỉ cấp vai trò.
 * - Chưa có → tạo tài khoản với mật khẩu admin đặt, rồi cấp vai trò.
 */
export async function themTaiKhoan(formData: FormData): Promise<KetQuaThaoTac> {
  if (!(await kiemTraAdmin())) return { ok: false, loi: CHI_ADMIN };
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, loi: "Hệ thống chưa được cấu hình." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const vaiTro = String(formData.get("vaiTro") ?? "") as VaiTro;
  const matKhau = String(formData.get("matKhau") ?? "");

  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, loi: "Email chưa đúng định dạng." };
  if (!VAI_TRO.includes(vaiTro)) return { ok: false, loi: "Vai trò không hợp lệ." };

  const { data: coSan, error: loiTim } = await admin.rpc("tim_user_id_theo_email", { p_email: email });
  if (loiTim) {
    console.error("[admin/accounts] Không tra được email:", loiTim.message);
    return { ok: false, loi: "Không kiểm tra được email, bạn thử lại nhé." };
  }

  let userId = (coSan as string | null) ?? null;
  let vuaTao = false;

  if (!userId) {
    if (matKhau.length < MAT_KHAU_TOI_THIEU) {
      return {
        ok: false,
        loi: `Email này chưa có tài khoản — cần đặt mật khẩu ban đầu (ít nhất ${MAT_KHAU_TOI_THIEU} ký tự).`,
      };
    }
    if (new TextEncoder().encode(matKhau).length > MAT_KHAU_TOI_DA_BYTE) {
      return { ok: false, loi: "Mật khẩu quá dài." };
    }
    const { data: tao, error: loiTao } = await admin.auth.admin.createUser({
      email,
      password: matKhau,
      email_confirm: true,
    });
    if (loiTao || !tao.user) {
      console.error("[admin/accounts] Không tạo được tài khoản:", loiTao?.status, loiTao?.code);
      return {
        ok: false,
        loi:
          loiTao?.code === "weak_password"
            ? "Mật khẩu quá dễ đoán, chọn mật khẩu khác nhé."
            : "Không tạo được tài khoản, bạn thử lại nhé.",
      };
    }
    userId = tao.user.id;
    vuaTao = true;
  }

  const ket = await capVaiTro(await taoClientAuth(), userId, email, vaiTro);
  if (!ket.ok) {
    // Cấp vai trò hỏng thì dọn luôn tài khoản vừa tạo, không để tài khoản mồ côi.
    if (vuaTao) await admin.auth.admin.deleteUser(userId);
    if (ket.maLoi === "23505") return { ok: false, loi: "Email này đã có vai trò trong trang quản trị." };
    return { ok: false, loi: "Không cấp được vai trò, bạn thử lại nhé." };
  }

  revalidatePath("/admin/accounts");
  return {
    ok: true,
    thongBao: vuaTao
      ? `Đã tạo tài khoản ${email}. Gửi email và mật khẩu ban đầu cho người đó để đăng nhập.`
      : `Đã cấp quyền cho tài khoản có sẵn ${email}. Người đó đăng nhập bằng mật khẩu hiện tại của họ.`,
  };
}

export async function doiVaiTroAction(userId: string, vaiTro: VaiTro): Promise<KetQuaThaoTac> {
  const toi = await kiemTraAdmin();
  if (!toi) return { ok: false, loi: CHI_ADMIN };
  if (!UUID_RE.test(userId) || !VAI_TRO.includes(vaiTro)) return { ok: false, loi: "Dữ liệu không hợp lệ." };
  if (userId === toi.id) return { ok: false, loi: "Không tự đổi vai trò của chính mình." };

  if (!(await doiVaiTro(await taoClientAuth(), userId, vaiTro))) {
    return { ok: false, loi: "Không đổi được vai trò, bạn thử lại nhé." };
  }
  revalidatePath("/admin/accounts");
  return { ok: true };
}

export async function goVaiTroAction(userId: string): Promise<KetQuaThaoTac> {
  const toi = await kiemTraAdmin();
  if (!toi) return { ok: false, loi: CHI_ADMIN };
  if (!UUID_RE.test(userId)) return { ok: false, loi: "Dữ liệu không hợp lệ." };
  if (userId === toi.id) return { ok: false, loi: "Không tự gỡ quyền của chính mình." };

  if (!(await goVaiTro(await taoClientAuth(), userId))) {
    return { ok: false, loi: "Không gỡ được quyền, bạn thử lại nhé." };
  }
  revalidatePath("/admin/accounts");
  return { ok: true };
}
