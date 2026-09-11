"use client";

import React from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { guiMagicLink } from "@/app/login/actions";

export function FormMagicLink({ emailBanDau, next }: { emailBanDau: string; next: string }) {
  const [email, setEmail] = React.useState(emailBanDau);
  // Email đã gửi link thành công — khác null thì hiện màn hình "kiểm tra hộp thư".
  const [daGuiToi, setDaGuiToi] = React.useState<string | null>(null);
  const [loi, setLoi] = React.useState<string | null>(null);
  const [dangGui, batDau] = React.useTransition();

  function gui(e: React.FormEvent) {
    e.preventDefault();
    setLoi(null);

    const form = new FormData();
    form.set("email", email);
    form.set("next", next);

    batDau(async () => {
      const ket = await guiMagicLink(form);
      if (ket.ok) setDaGuiToi(email.trim());
      else setLoi(ket.loi ?? "Có lỗi xảy ra, bạn thử lại nhé.");
    });
  }

  if (daGuiToi) {
    return (
      <div className="space-y-4 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <MailCheck className="size-6" />
        </span>
        <div className="space-y-1">
          <p className="font-medium">Kiểm tra hộp thư của bạn</p>
          <p className="text-sm text-muted-foreground">
            Link đăng nhập đã được gửi tới <strong className="text-foreground">{daGuiToi}</strong>.
            Bấm vào link trong thư là vào thẳng cổng hồ sơ.
          </p>
        </div>
        <p className="rounded-lg bg-muted/50 p-3 text-left text-xs text-muted-foreground">
          Mở link trên chính trình duyệt này. Không thấy thư sau vài phút thì xem thêm mục Spam
          hoặc Quảng cáo.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setDaGuiToi(null);
            setLoi(null);
          }}
        >
          Dùng email khác
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={gui} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          autoFocus={!emailBanDau}
          placeholder="ban@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Dùng đúng email bạn đã đăng ký nhận báo giá.
        </p>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={dangGui}>
        {dangGui ? "Đang gửi…" : "Gửi link đăng nhập"}
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
  );
}
