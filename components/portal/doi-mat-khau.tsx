"use client";

import React from "react";
import { Check, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { doiMatKhau } from "@/app/login/actions";
import { MAT_KHAU_TOI_THIEU } from "@/lib/mat-khau";

export function DoiMatKhau() {
  const [mo, setMo] = React.useState(false);
  const [matKhau, setMatKhau] = React.useState("");
  const [nhapLai, setNhapLai] = React.useState("");
  const [loi, setLoi] = React.useState<string | null>(null);
  const [xong, setXong] = React.useState(false);
  const [dangGui, batDau] = React.useTransition();

  function gui(e: React.FormEvent) {
    e.preventDefault();
    setLoi(null);
    if (matKhau !== nhapLai) {
      setLoi("Hai lần nhập mật khẩu chưa khớp nhau.");
      return;
    }
    const form = new FormData();
    form.set("matKhau", matKhau);
    form.set("nhapLai", nhapLai);
    batDau(async () => {
      const ket = await doiMatKhau(form);
      if (ket.ok) {
        setXong(true);
        setMo(false);
        setMatKhau("");
        setNhapLai("");
      } else {
        setLoi(ket.loi ?? "Có lỗi xảy ra, bạn thử lại nhé.");
      }
    });
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Mật khẩu</p>
            <p className="text-sm text-muted-foreground">
              Đặt hoặc đổi mật khẩu dùng để đăng nhập cổng hồ sơ.
            </p>
          </div>
        </div>
        {!mo && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setMo(true);
              setXong(false);
            }}
          >
            Đổi mật khẩu
          </Button>
        )}
      </div>

      {xong && (
        <p className="mt-4 flex items-center gap-2 text-sm text-green-700">
          <Check className="size-4" /> Đã lưu mật khẩu mới. Lần sau đăng nhập bằng email và mật
          khẩu này nhé.
        </p>
      )}

      {mo && (
        <form onSubmit={gui} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="matKhauMoi">Mật khẩu mới</Label>
            <Input
              id="matKhauMoi"
              type="password"
              required
              minLength={MAT_KHAU_TOI_THIEU}
              autoComplete="new-password"
              value={matKhau}
              onChange={(e) => setMatKhau(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Ít nhất {MAT_KHAU_TOI_THIEU} ký tự.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nhapLaiMoi">Nhập lại mật khẩu mới</Label>
            <Input
              id="nhapLaiMoi"
              type="password"
              required
              autoComplete="new-password"
              value={nhapLai}
              onChange={(e) => setNhapLai(e.target.value)}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={dangGui}>
              {dangGui ? "Đang lưu…" : "Lưu mật khẩu"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setMo(false);
                setLoi(null);
              }}
            >
              Huỷ
            </Button>
          </div>
          {loi && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 sm:col-span-2"
            >
              {loi}
            </p>
          )}
        </form>
      )}
    </Card>
  );
}
