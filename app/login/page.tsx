import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { FormDangNhap } from "@/components/login/form-dang-nhap";
import { duongDanQuayVeAnToan, layNguoiDung } from "@/lib/dal";
import { daCauHinhAuth } from "@/lib/supabase-auth";
import { thongTinLienHe } from "@/lib/qna";

// Đọc phiên đăng nhập theo từng request, không prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đăng nhập cổng hồ sơ — DuHoc24",
  description: "Đăng nhập cổng hồ sơ DuHoc24 bằng email và mật khẩu.",
};

// Chỉ hiển thị thông báo theo MÃ cố định, không in thẳng chữ từ URL ra trang —
// tránh việc ai đó gửi link kèm câu tuỳ ý để lừa khách. Các mã này do
// /auth/callback đặt ra khi khách bấm link cũ trong email.
const THONG_BAO_LOI: Record<string, string> = {
  link_het_han: "Link trong email đã hết hạn hoặc đã được dùng. Bạn đăng nhập bằng email và mật khẩu ở dưới nhé.",
  khac_trinh_duyet: "Link trong email không mở được trên trình duyệt này. Bạn đăng nhập bằng email và mật khẩu ở dưới nhé.",
  link_khong_hop_le: "Link không hợp lệ. Bạn đăng nhập bằng email và mật khẩu ở dưới nhé.",
  chua_cau_hinh: "Chức năng đăng nhập chưa được cấu hình. Vui lòng liên hệ quản trị viên.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, loi, da_dang_xuat } = await searchParams;
  const quayVe = duongDanQuayVeAnToan(next);

  // Đã đăng nhập rồi thì vào thẳng cổng hồ sơ.
  if (await layNguoiDung()) redirect(quayVe);

  const thongBaoLoi = typeof loi === "string" ? THONG_BAO_LOI[loi] : undefined;
  const configured = daCauHinhAuth();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 pb-24 pt-32">
        <h1 className="text-balance text-3xl font-medium tracking-tight">Đăng nhập cổng hồ sơ</h1>
        <p className="mt-3 text-muted-foreground">
          Đăng nhập bằng email và mật khẩu. Lần đầu vào thì chọn &ldquo;Tạo tài khoản&rdquo; với
          email bạn đã gửi yêu cầu báo giá.
        </p>

        {da_dang_xuat && !thongBaoLoi && (
          <p className="mt-6 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            Bạn đã đăng xuất.
          </p>
        )}

        {thongBaoLoi && (
          <p
            role="alert"
            className="mt-6 flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 ring-1 ring-inset ring-yellow-200"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{thongBaoLoi}</span>
          </p>
        )}

        <Card className="mt-6 p-6 md:p-8">
          {configured ? (
            <FormDangNhap next={quayVe} />
          ) : (
            <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 ring-1 ring-inset ring-yellow-200">
              Chức năng đăng nhập chưa được cấu hình. Vui lòng liên hệ quản trị viên.
            </p>
          )}
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Quên mật khẩu hoặc cần hỗ trợ? Gọi {thongTinLienHe.dienThoai}
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
