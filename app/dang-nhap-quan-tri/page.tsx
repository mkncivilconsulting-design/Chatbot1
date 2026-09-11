import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormDangNhap } from "@/components/login/form-dang-nhap";
import { duongDanQuayVeAnToan, layNguoiDung, layTaiKhoanQuanTri } from "@/lib/dal";
import { daCauHinhAuth } from "@/lib/supabase-auth";
import { dangXuatQuanTri } from "@/app/login/actions";

// Đọc phiên đăng nhập theo từng request, không prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đăng nhập quản trị — DuHoc24",
  robots: { index: false },
};

export default async function DangNhapQuanTriPage({
  searchParams,
}: PageProps<"/dang-nhap-quan-tri">) {
  const { next, da_dang_xuat } = await searchParams;
  const quayVe = duongDanQuayVeAnToan(next, "/admin");
  const dichDen = quayVe.startsWith("/admin") ? quayVe : "/admin";

  const nguoiDung = await layNguoiDung();
  // Đã đăng nhập và có vai trò → vào thẳng trang quản trị.
  if (nguoiDung && (await layTaiKhoanQuanTri())) redirect(dichDen);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 pb-24 pt-32">
        <h1 className="text-balance text-3xl font-medium tracking-tight">Đăng nhập quản trị</h1>
        <p className="mt-3 text-muted-foreground">
          Dành cho admin và nhân viên trung tâm. Tài khoản do admin cấp.
        </p>

        {da_dang_xuat && !nguoiDung && (
          <p className="mt-6 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            Bạn đã đăng xuất.
          </p>
        )}

        <Card className="mt-6 p-6 md:p-8">
          {nguoiDung ? (
            // Đăng nhập rồi nhưng không có vai trò (ví dụ tài khoản học viên).
            <div className="space-y-4 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-200">
                <ShieldAlert className="size-6" />
              </span>
              <div className="space-y-1">
                <p className="font-medium">Tài khoản không có quyền quản trị</p>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{nguoiDung.email}</strong> chưa được cấp vai
                  trò admin hay nhân viên. Nhờ admin cấp quyền, hoặc đăng xuất để dùng tài khoản
                  khác.
                </p>
              </div>
              <form action={dangXuatQuanTri}>
                <Button type="submit" variant="outline">
                  Đăng xuất
                </Button>
              </form>
            </div>
          ) : daCauHinhAuth() ? (
            <FormDangNhap next={dichDen} choPhepTaoTaiKhoan={false} />
          ) : (
            <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 ring-1 ring-inset ring-yellow-200">
              Chức năng đăng nhập chưa được cấu hình.
            </p>
          )}
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
