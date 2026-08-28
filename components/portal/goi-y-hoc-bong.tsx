"use client";

import React from "react";
import { GraduationCap, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { timHocBongPhuHop } from "@/app/portal/actions";
import type { GoiYDaLuu } from "@/lib/scholarship-advisor";

export function GoiYHocBong({
  goiY,
  soTruongDat,
  sanSang,
}: {
  goiY: GoiYDaLuu | null;
  soTruongDat: number;
  /** Đã có đủ điểm và có ít nhất một trường đạt yêu cầu. */
  sanSang: boolean;
}) {
  const [dangChay, batDau] = React.useTransition();
  const [loi, setLoi] = React.useState<string | null>(null);

  // Số trường đạt đã đổi kể từ lần gợi ý trước → gợi ý có thể đã cũ.
  const daCu = goiY !== null && goiY.soTruong !== soTruongDat;

  function chay() {
    setLoi(null);
    batDau(async () => {
      const ket = await timHocBongPhuHop();
      if (!ket.ok) setLoi(ket.loi ?? "Có lỗi xảy ra.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="size-5" />
              Học bổng phù hợp
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {goiY
                ? `Tra cứu lúc ${new Date(goiY.luc).toLocaleString("vi-VN")} cho ${goiY.soTruong} trường bạn đạt yêu cầu.`
                : "Hệ thống sẽ tra học bổng của các trường bạn đạt yêu cầu rồi đối chiếu với điểm của bạn."}
            </p>
          </div>
          <Button onClick={chay} disabled={dangChay || !sanSang} variant={goiY ? "outline" : "default"}>
            {dangChay ? "Đang tra cứu…" : goiY ? "Tra cứu lại" : "Tìm học bổng phù hợp"}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!sanSang && (
          <p className="text-sm text-muted-foreground">
            Nộp đủ bảng điểm và chứng chỉ IELTS, và đạt yêu cầu ít nhất một trường, thì mới tra cứu
            học bổng được bạn nhé.
          </p>
        )}

        {daCu && (
          <p className="mb-4 flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 ring-1 ring-inset ring-yellow-200">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            Số trường bạn đạt yêu cầu đã thay đổi ({soTruongDat} trường) so với lần tra trước (
            {goiY.soTruong} trường). Bấm “Tra cứu lại” để cập nhật.
          </p>
        )}

        {loi && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {loi}
          </p>
        )}

        {goiY && (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{goiY.noiDung}</div>
        )}
      </CardContent>
    </Card>
  );
}
