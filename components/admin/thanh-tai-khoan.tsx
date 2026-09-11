import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HuyHieuVaiTro, type ThongTinTaiKhoan } from "@/components/admin/sidebar";
import { dangXuatQuanTri } from "@/app/login/actions";

/**
 * Thanh tài khoản ở đầu mọi trang quản trị: ai đang đăng nhập, vai trò gì, và
 * nút đăng xuất — hiện ở mọi kích thước màn hình.
 */
export function ThanhTaiKhoan({ taiKhoan }: { taiKhoan: ThongTinTaiKhoan }) {
  return (
    <div className="flex items-center justify-end gap-3 border-b px-6 py-3 md:px-10">
      <span
        className="min-w-0 truncate text-sm text-muted-foreground"
        title={taiKhoan.email ?? undefined}
      >
        {taiKhoan.email}
      </span>
      <HuyHieuVaiTro vaiTro={taiKhoan.vaiTro} />
      <form action={dangXuatQuanTri}>
        <Button type="submit" variant="outline" size="sm">
          <LogOut />
          Đăng xuất
        </Button>
      </form>
    </div>
  );
}
