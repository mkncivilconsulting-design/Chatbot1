"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileClock,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  School,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { dangXuatQuanTri } from "@/app/login/actions";

type VaiTro = "admin" | "nhan_vien";

export interface ThongTinTaiKhoan {
  email: string | null;
  vaiTro: VaiTro;
}

export const adminNavItems: {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Chỉ hiện cho admin. Trang đó vẫn tự chặn nhân viên — ẩn menu chỉ để gọn. */
  chiAdmin?: boolean;
}[] = [
  { name: "Tổng quan", href: "/admin", icon: LayoutDashboard },
  { name: "Yêu cầu", href: "/admin/requests", icon: FileClock },
  { name: "Trường tham chiếu", href: "/admin/schools", icon: School },
  { name: "Hồ sơ học viên", href: "/admin/profiles", icon: Users },
  { name: "Hội thoại", href: "/admin/conversations", icon: MessageSquare },
  { name: "Tài khoản", href: "/admin/accounts", icon: KeyRound, chiAdmin: true },
];

const TEN_VAI_TRO: Record<VaiTro, string> = { admin: "Admin", nhan_vien: "Nhân viên" };

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function menuTheoVaiTro(vaiTro: VaiTro) {
  return adminNavItems.filter((i) => !i.chiAdmin || vaiTro === "admin");
}

export function HuyHieuVaiTro({ vaiTro }: { vaiTro: VaiTro }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        vaiTro === "admin"
          ? "bg-primary/10 text-foreground ring-primary/20"
          : "bg-muted text-muted-foreground ring-border",
      )}
    >
      {TEN_VAI_TRO[vaiTro]}
    </span>
  );
}

export function AdminSidebar({ taiKhoan }: { taiKhoan: ThongTinTaiKhoan }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:flex lg:flex-col">
      <div className="border-b px-5 py-5">
        <Link href="/">
          <Logo uniColor />
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">Admin dashboard</p>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {menuTheoVaiTro(taiKhoan.vaiTro).map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm duration-150",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4.5 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t p-3">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium" title={taiKhoan.email ?? undefined}>
            {taiKhoan.email}
          </p>
          <div className="mt-1">
            <HuyHieuVaiTro vaiTro={taiKhoan.vaiTro} />
          </div>
        </div>
        <form action={dangXuatQuanTri}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4.5 shrink-0" />
            Đăng xuất
          </button>
        </form>
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          Xem trang khách ↗
        </Link>
      </div>
    </aside>
  );
}

export function AdminMobileNav({ taiKhoan }: { taiKhoan: ThongTinTaiKhoan }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b bg-sidebar px-3 py-2 lg:hidden">
      {menuTheoVaiTro(taiKhoan.vaiTro).map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs duration-150",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent",
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            {item.name}
          </Link>
        );
      })}
      <span className="ml-auto flex shrink-0 items-center gap-2 pl-2">
        <HuyHieuVaiTro vaiTro={taiKhoan.vaiTro} />
        <form action={dangXuatQuanTri}>
          <button
            type="submit"
            aria-label="Đăng xuất"
            className="flex size-7 items-center justify-center rounded-full text-sidebar-foreground/70 hover:bg-sidebar-accent"
          >
            <LogOut className="size-3.5" />
          </button>
        </form>
      </span>
    </nav>
  );
}
