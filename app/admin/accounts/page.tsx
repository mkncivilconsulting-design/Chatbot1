import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HuyHieuVaiTro } from "@/components/admin/sidebar";
import { ChonVaiTro, FormThemTaiKhoan } from "@/components/admin/quan-ly-tai-khoan";
import { NutXoa } from "@/components/admin/nut-xac-nhan";
import { danhSachTaiKhoan } from "@/lib/admin-accounts";
import { batBuocQuanTri } from "@/lib/dal";
import { taoClientAuth } from "@/lib/supabase-auth";
import { goVaiTroAction } from "@/app/admin/accounts/actions";

// Đọc database theo từng request bằng phiên của admin đang đăng nhập (RLS).
export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  const taiKhoan = await batBuocQuanTri("/admin/accounts");
  // Trang này chỉ dành cho admin. (RLS cũng chỉ cho nhân viên đọc dòng của chính họ.)
  if (taiKhoan.vaiTro !== "admin") redirect("/admin");

  const danhSach = await danhSachTaiKhoan(await taoClientAuth());

  return (
    <>
      <AdminPageHeader
        title="Tài khoản"
        description="Ai được vào trang quản trị và với vai trò gì. Admin: xem, sửa, xoá. Nhân viên: chỉ xem."
      />

      <Card className="mb-6 p-5">
        <h2 className="mb-4 font-medium">Thêm người vào trang quản trị</h2>
        <FormThemTaiKhoan />
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Thêm lúc</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {danhSach.map((t) => {
              const laToi = t.userId === taiKhoan.id;
              return (
                <TableRow key={t.userId}>
                  <TableCell className="font-medium">
                    {t.email}
                    {laToi && <span className="ml-2 text-xs text-muted-foreground">(bạn)</span>}
                  </TableCell>
                  <TableCell>
                    {/* Không tự đổi/gỡ vai trò của chính mình — database cũng chặn việc này. */}
                    {laToi ? (
                      <HuyHieuVaiTro vaiTro={t.vaiTro} />
                    ) : (
                      <ChonVaiTro userId={t.userId} vaiTro={t.vaiTro} />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(t.taoLuc).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    {!laToi && (
                      <NutXoa
                        nho
                        nhan="Gỡ quyền"
                        cauHoi={`Gỡ quyền quản trị của ${t.email}?`}
                        hanhDong={goVaiTroAction.bind(null, t.userId)}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
