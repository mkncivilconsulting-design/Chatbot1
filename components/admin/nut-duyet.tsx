"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duyetYeuCau } from "@/app/admin/requests/actions";
import type { RequestStatus } from "@/lib/mock-data";

export function NutDuyet({ id, trangThai }: { id: string; trangThai: RequestStatus }) {
  const [dangChay, batDau] = React.useTransition();
  const [loi, setLoi] = React.useState<string | null>(null);

  function doi(moi: RequestStatus) {
    setLoi(null);
    batDau(async () => {
      const ket = await duyetYeuCau(id, moi);
      if (!ket.ok) setLoi(ket.loi ?? "Có lỗi xảy ra.");
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
      {loi && <span className="text-xs text-red-600">{loi}</span>}
    </div>
  );
}
