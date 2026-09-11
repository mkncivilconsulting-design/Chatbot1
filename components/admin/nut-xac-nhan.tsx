"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Nút xoá hai bước: bấm lần đầu hỏi lại, bấm "Xoá" lần nữa mới chạy. Chỉ trang
 * của admin mới render nút này — nhân viên không thấy nút nào để bấm.
 */
export function NutXoa({
  nhan,
  cauHoi,
  hanhDong,
  nho = false,
}: {
  nhan: string;
  cauHoi: string;
  /** Server Action đã bind sẵn tham số. */
  hanhDong: () => Promise<{ ok: boolean; loi?: string } | void>;
  nho?: boolean;
}) {
  const [hoi, setHoi] = React.useState(false);
  const [loi, setLoi] = React.useState<string | null>(null);
  const [dangChay, batDau] = React.useTransition();

  function xoa() {
    setLoi(null);
    batDau(async () => {
      const ket = await hanhDong();
      if (ket && !ket.ok) {
        setLoi(ket.loi ?? "Không xoá được.");
        setHoi(false);
      }
    });
  }

  if (!hoi) {
    return (
      <span className="inline-flex flex-col items-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size={nho ? "xs" : "sm"}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => setHoi(true)}
        >
          <Trash2 />
          {nhan}
        </Button>
        {loi && <span className="text-xs text-red-600">{loi}</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700 ring-1 ring-inset ring-red-200">
      {cauHoi}
      <Button
        type="button"
        size="xs"
        variant="destructive"
        className="bg-red-600 text-white hover:bg-red-700"
        disabled={dangChay}
        onClick={xoa}
      >
        {dangChay ? "Đang xoá…" : "Xoá"}
      </Button>
      <Button type="button" size="xs" variant="ghost" disabled={dangChay} onClick={() => setHoi(false)}>
        Huỷ
      </Button>
    </span>
  );
}
