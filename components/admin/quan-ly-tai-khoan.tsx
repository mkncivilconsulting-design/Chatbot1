"use client";

import React from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { doiVaiTroAction, themTaiKhoan } from "@/app/admin/accounts/actions";
import { MAT_KHAU_TOI_THIEU } from "@/lib/mat-khau";

type VaiTro = "admin" | "nhan_vien";

const LUA_CHON: { giaTri: VaiTro; nhan: string; moTa: string }[] = [
  { giaTri: "nhan_vien", nhan: "Nhân viên", moTa: "Chỉ xem" },
  { giaTri: "admin", nhan: "Admin", moTa: "Xem, sửa, xoá" },
];

export function FormThemTaiKhoan() {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [loi, setLoi] = React.useState<string | null>(null);
  const [thongBao, setThongBao] = React.useState<string | null>(null);
  const [dangGui, batDau] = React.useTransition();

  function gui(formData: FormData) {
    setLoi(null);
    setThongBao(null);
    batDau(async () => {
      const ket = await themTaiKhoan(formData);
      if (ket.ok) {
        setThongBao(ket.thongBao ?? "Đã thêm.");
        formRef.current?.reset();
      } else {
        setLoi(ket.loi ?? "Có lỗi xảy ra.");
      }
    });
  }

  return (
    <form ref={formRef} action={gui} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="tk-email">Email</Label>
        <Input id="tk-email" name="email" type="email" required placeholder="nhanvien@duhoc24.vn" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tk-matkhau">Mật khẩu ban đầu</Label>
        <Input
          id="tk-matkhau"
          name="matKhau"
          type="password"
          autoComplete="new-password"
          placeholder={`Chỉ cần nếu email chưa có tài khoản`}
          minLength={MAT_KHAU_TOI_THIEU}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tk-vaitro">Vai trò</Label>
        <select
          id="tk-vaitro"
          name="vaiTro"
          defaultValue="nhan_vien"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          {LUA_CHON.map((c) => (
            <option key={c.giaTri} value={c.giaTri}>
              {c.nhan} — {c.moTa}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={dangGui}>
        <UserPlus />
        {dangGui ? "Đang thêm…" : "Thêm"}
      </Button>

      {thongBao && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800 ring-1 ring-inset ring-green-200 sm:col-span-4">
          {thongBao}
        </p>
      )}
      {loi && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 sm:col-span-4">
          {loi}
        </p>
      )}
    </form>
  );
}

export function ChonVaiTro({ userId, vaiTro }: { userId: string; vaiTro: VaiTro }) {
  const [loi, setLoi] = React.useState<string | null>(null);
  const [dangDoi, batDau] = React.useTransition();

  return (
    <span className="inline-flex flex-col gap-1">
      <select
        aria-label="Vai trò"
        defaultValue={vaiTro}
        disabled={dangDoi}
        onChange={(e) => {
          const moi = e.target.value as VaiTro;
          setLoi(null);
          batDau(async () => {
            const ket = await doiVaiTroAction(userId, moi);
            if (!ket.ok) {
              setLoi(ket.loi ?? "Không đổi được.");
              e.target.value = vaiTro;
            }
          });
        }}
        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
      >
        {LUA_CHON.map((c) => (
          <option key={c.giaTri} value={c.giaTri}>
            {c.nhan}
          </option>
        ))}
      </select>
      {loi && <span className="text-xs text-red-600">{loi}</span>}
    </span>
  );
}
