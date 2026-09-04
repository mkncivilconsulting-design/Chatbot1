"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duyetYeuCau } from "@/app/admin/requests/actions";
import type { RequestStatus } from "@/lib/mock-data";

export function NutDuyet({ id, trangThai }: { id: string; trangThai: RequestStatus }) {
  const [dangChay, batDau] = React.useTransition();
  const [loi, setLoi] = React.useState<string | null>(null);
  const [canhBao, setCanhBao] = React.useState<string | null>(null);

  function doi(moi: RequestStatus) {
    setLoi(null);
    setCanhBao(null);
    batDau(async () => {
      const ket = await duyetYeuCau(id, moi);
      if (!ket.ok) {
        setLoi(ket.loi ?? "Có lỗi xảy ra.");
        return;
      }
      // Trạng thái đã đổi, nhưng nếu webhook hỏng thì khách KHÔNG nhận được
      // link đăng nhập — admin phải biết để còn liên hệ bằng cách khác.
      if (moi === "da_duyet" && ket.daGuiLinkDangNhap !== true) {
        setCanhBao("Đã duyệt nhưng chưa gửi được link đăng nhập cho khách.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-2">
        <Button
          size="icon-sm"
          variant="outline"
          aria-label="Duyệt"
          title="Duyệt"
          disabled={dangChay || trangThai === "da_duyet"}
          onClick={() => doi("da_duyet")}
        >
          <Check className="size-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          aria-label="Từ chối"
          title="Từ chối"
          disabled={dangChay || trangThai === "tu_choi"}
          onClick={() => doi("tu_choi")}
        >
          <X className="size-3.5" />
        </Button>
      </div>
      {loi && <span className="text-right text-xs text-red-600">{loi}</span>}
      {canhBao && (
        <span className="max-w-52 text-right text-xs text-yellow-700">{canhBao}</span>
      )}
    </div>
  );
}
