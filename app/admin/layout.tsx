import { AdminSidebar, AdminMobileNav } from "@/components/admin/sidebar";
import { batBuocQuanTri } from "@/lib/dal";

// Mọi trang /admin cần đăng nhập với vai trò admin hoặc nhan_vien. Layout chặn
// ở đây để không lộ khung trang, NHƯNG layout không chạy lại khi chuyển giữa các
// trang con — nên từng trang vẫn tự gọi batBuocQuanTri(), và RLS trong database
// là lớp chặn cuối cùng.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const taiKhoan = await batBuocQuanTri();
  const thongTin = { email: taiKhoan.email, vaiTro: taiKhoan.vaiTro };

  return (
    <div className="flex min-h-screen">
      <AdminSidebar taiKhoan={thongTin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileNav taiKhoan={thongTin} />
        <main className="flex-1 px-6 py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}
