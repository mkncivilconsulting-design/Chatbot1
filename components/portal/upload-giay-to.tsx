"use client";

import React from "react";
import { FileText, IdCard, Medal, Upload, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocStatusBadge } from "@/components/status-badge";
import { napGiayTo } from "@/app/portal/actions";
import type { LoaiGiayTo } from "@/lib/document-extraction";
import type { GiayToDaNop } from "@/lib/student-profile";

// Icon chọn TẠI ĐÂY chứ không nhận qua props: component React là một hàm, mà
// Server Component không truyền hàm sang Client Component được — làm vậy trang
// sẽ lỗi 500 lúc chạy dù build và typecheck vẫn sạch.
const ICON: Record<LoaiGiayTo, LucideIcon> = {
  bang_diem: FileText,
  ielts: Medal,
  giay_to_tuy_than: IdCard,
};

export function UploadGiayTo({
  loai,
  tieuDe,
  moTa,
  accept,
  daNop,
}: {
  loai: LoaiGiayTo;
  tieuDe: string;
  moTa: string;
  accept: string;
  daNop: GiayToDaNop | null;
}) {
  const Icon = ICON[loai];
  const [dangChay, batDau] = React.useTransition();
  const [loi, setLoi] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function chon(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoi(null);

    const form = new FormData();
    form.set("loai", loai);
    form.set("file", file);

    batDau(async () => {
      const ket = await napGiayTo(form);
      if (!ket.ok) setLoi(ket.loi ?? "Có lỗi xảy ra.");
      // Xoá giá trị input để chọn lại đúng file đó vẫn kích hoạt onChange.
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-6 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{tieuDe}</h3>
            <DocStatusBadge status={daNop?.trangThai ?? "chua_nop"} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{moTa}</p>
        </div>
      </div>

      {daNop && (
        <p className="mt-3 truncate text-xs text-muted-foreground" title={daNop.tenFile}>
          Đã nộp: {daNop.tenFile}
        </p>
      )}

      {daNop?.lyDo && (
        <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {daNop.lyDo}
        </p>
      )}

      {loi && (
        <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {loi}
        </p>
      )}

      <div className="mt-4 flex-1" />

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={chon}
        disabled={dangChay}
        className="hidden"
        id={`file-${loai}`}
      />
      <Button
        type="button"
        variant={daNop ? "outline" : "default"}
        disabled={dangChay}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-4" />
        {dangChay ? "Đang đọc giấy tờ…" : daNop ? "Nộp lại" : "Chọn file để tải lên"}
      </Button>
    </Card>
  );
}
