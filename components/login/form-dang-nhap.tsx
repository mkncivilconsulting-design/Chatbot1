"use client";

import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { dangNhap, taoTaiKhoan } from "@/app/login/actions";
import { MAT_KHAU_TOI_THIEU } from "@/lib/mat-khau";

type CheDo = "dang_nhap" | "tao_tai_khoan";

const CAC_CHE_DO: { id: CheDo; nhan: string }[] = [
  { id: "dang_nhap", nhan: "Đăng nhập" },
  { id: "tao_tai_khoan", nhan: "Tạo tài khoản" },
];

export function FormDangNhap({ next }: { next: string }) {
  const [cheDo, setCheDo] = React.useState<CheDo>("dang_nhap");
  const [email, setEmail] = React.useState("");
  const [matKhau, setMatKhau] = React.useState("");
  const [nhapLai, setNhapLai] = React.useState("");
  const [hienMatKhau, setHienMatKhau] = React.useState(false);
  const [loi, setLoi] = React.useState<string | null>(null);
  const [dangGui, batDau] = React.useTransition();

  const taoMoi = cheDo === "tao_tai_khoan";

  function doiCheDo(moi: CheDo) {
    setCheDo(moi);
    setLoi(null);
    setNhapLai("");
  }

  function gui(e: React.FormEvent) {
    e.preventDefault();
    setLoi(null);

    if (taoMoi && matKhau !== nhapLai) {
      setLoi("Hai lần nhập mật khẩu chưa khớp nhau.");
      return;
    }

    const form = new FormData();
    form.set("email", email);
    form.set("matKhau", matKhau);
    form.set("next", next);
    if (taoMoi) form.set("nhapLai", nhapLai);

    batDau(async () => {
      // Thành công thì server tự chuyển sang cổng hồ sơ, nên chỉ cần xử lý lỗi.
      const ket = taoMoi ? await taoTaiKhoan(form) : await dangNhap(form);
      if (!ket.ok) setLoi(ket.loi ?? "Có lỗi xảy ra, bạn thử lại nhé.");
    });
  }

  return (
    <div className="space-y-6">
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {CAC_CHE_DO.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={cheDo === c.id}
            onClick={() => doiCheDo(c.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium duration-150",
              cheDo === c.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {c.nhan}
          </button>
        ))}
      </div>

      <form onSubmit={gui} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="ban@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {taoMoi && (
            <p className="text-xs text-muted-foreground">
              Dùng đúng email bạn đã gửi yêu cầu báo giá.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="matKhau">Mật khẩu</Label>
          <div className="relative">
            <Input
              id="matKhau"
              type={hienMatKhau ? "text" : "password"}
              required
              minLength={taoMoi ? MAT_KHAU_TOI_THIEU : undefined}
              autoComplete={taoMoi ? "new-password" : "current-password"}
              value={matKhau}
              onChange={(e) => setMatKhau(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setHienMatKhau((v) => !v)}
              aria-label={hienMatKhau ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {hienMatKhau ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {taoMoi && (
            <p className="text-xs text-muted-foreground">Ít nhất {MAT_KHAU_TOI_THIEU} ký tự.</p>
          )}
        </div>

        {taoMoi && (
          <div className="space-y-2">
            <Label htmlFor="nhapLai">Nhập lại mật khẩu</Label>
            <Input
              id="nhapLai"
              type={hienMatKhau ? "text" : "password"}
              required
              autoComplete="new-password"
              value={nhapLai}
              onChange={(e) => setNhapLai(e.target.value)}
            />
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={dangGui}>
          {dangGui ? "Đang xử lý…" : taoMoi ? "Tạo tài khoản" : "Đăng nhập"}
        </Button>

        {loi && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200"
          >
            {loi}
          </p>
        )}
      </form>
    </div>
  );
}
