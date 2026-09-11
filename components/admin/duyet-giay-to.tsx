"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { duyetGiayToAction, xoaGiayToAction } from "@/app/admin/profiles/actions";
import { NutXoa } from "@/components/admin/nut-xac-nhan";
import type { LoaiGiayTo } from "@/lib/document-extraction";
import type { DocStatus } from "@/lib/mock-data";

/**
 * Khu vực duyệt một giấy tờ — CHỈ render cho admin (trang quyết định việc này).
 * Admin chốt "Hợp lệ" hoặc "Cần nộp lại" kèm lý do, hoặc xoá giấy tờ.
 */
export function DuyetGiayTo({
  profileId,
  loai,
  trangThai,
  lyDo,
}: {
  profileId: string;
  loai: LoaiGiayTo;
  trangThai: DocStatus;
  lyDo: string | null;
}) {
  const [moi, setMoi] = React.useState<DocStatus>(trangThai === "hop_le" ? "hop_le" : "can_nop_lai");
  const [loi, setLoi] = React.useState<string | null>(null);
  const [daLuu, setDaLuu] = React.useState(false);
  const [dangLuu, batDau] = React.useTransition();

  function luu(formData: FormData) {
    setLoi(null);
    setDaLuu(false);
    batDau(async () => {
      const ket = await duyetGiayToAction(profileId, loai, formData);
      if (ket.ok) setDaLuu(true);
      else setLoi(ket.loi ?? "Không lưu được.");
    });
  }

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      <form action={luu} className="space-y-3">
        <fieldset className="flex flex-wrap gap-2 text-sm">
          <legend className="sr-only">Kết quả duyệt</legend>
          {(
            [
              ["hop_le", "Hợp lệ"],
              ["can_nop_lai", "Cần nộp lại"],
            ] as const
          ).map(([giaTri, nhan]) => (
            <label
              key={giaTri}
              className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 has-checked:border-primary has-checked:bg-accent"
            >
              <input
                type="radio"
                name="trangThai"
                value={giaTri}
                checked={moi === giaTri}
                onChange={() => setMoi(giaTri)}
              />
              {nhan}
            </label>
          ))}
        </fieldset>
        {moi === "can_nop_lai" && (
          <Textarea
            name="lyDo"
            rows={2}
            required
            defaultValue={lyDo ?? ""}
            placeholder="Lý do — học viên sẽ thấy dòng này trong cổng hồ sơ"
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="submit" size="sm" disabled={dangLuu}>
            {dangLuu ? "Đang lưu…" : "Lưu kết quả duyệt"}
          </Button>
          <NutXoa
            nho
            nhan="Xoá giấy tờ"
            cauHoi="Xoá giấy tờ này và file gốc?"
            hanhDong={xoaGiayToAction.bind(null, profileId, loai)}
          />
        </div>
      </form>
      {daLuu && <p className="text-xs text-green-700">Đã lưu. Học viên thấy ngay trong cổng hồ sơ.</p>}
      {loi && <p className="text-xs text-red-600">{loi}</p>}
    </div>
  );
}
