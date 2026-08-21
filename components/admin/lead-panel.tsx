"use client";

import React from "react";
import { Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { chayTrichXuatLead } from "@/app/admin/conversations/[id]/actions";
import type { LeadDaLuu } from "@/lib/leads";
import type { ChatLuongLead } from "@/lib/lead-extraction";

const nhanChatLuong: Record<ChatLuongLead, { nhan: string; mau: string }> = {
  good: { nhan: "Tốt", mau: "bg-green-100 text-green-700 ring-green-200" },
  ok: { nhan: "Tạm", mau: "bg-yellow-100 text-yellow-700 ring-yellow-200" },
  spam: { nhan: "Rác", mau: "bg-red-100 text-red-700 ring-red-200" },
};

export function HuyHieuChatLuong({ chatLuong }: { chatLuong: ChatLuongLead }) {
  const m = nhanChatLuong[chatLuong];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        m.mau,
      )}
    >
      {m.nhan}
    </span>
  );
}

function Dong({ nhan, giaTri }: { nhan: string; giaTri: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{nhan}</dt>
      <dd className={cn("mt-0.5 text-sm", giaTri ? "font-medium" : "text-muted-foreground")}>
        {giaTri ?? "—"}
      </dd>
    </div>
  );
}

export function LeadPanel({
  conversationId,
  lead,
  soTinNhanHienTai,
}: {
  conversationId: string;
  lead: LeadDaLuu | null;
  soTinNhanHienTai: number;
}) {
  const [dangChay, batDau] = React.useTransition();
  const [loi, setLoi] = React.useState<string | null>(null);

  // Hội thoại đã dài thêm kể từ lần trích xuất trước → lead có thể đã cũ.
  const daCu = lead !== null && lead.soTinNhanLucTrich < soTinNhanHienTai;

  function chay() {
    setLoi(null);
    batDau(async () => {
      const ket = await chayTrichXuatLead(conversationId);
      if (!ket.ok) setLoi(ket.loi ?? "Có lỗi xảy ra.");
    });
  }

  return (
    <Card className="mb-6 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-medium">
            Thông tin lead
            {lead && <HuyHieuChatLuong chatLuong={lead.chatLuong} />}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {lead
              ? `Trích xuất lúc ${new Date(lead.trichXuatLuc).toLocaleString("vi-VN")} từ ${lead.soTinNhanLucTrich} tin nhắn.`
              : "Chưa trích xuất. Bấm nút bên cạnh để Gemini đọc hội thoại và rút ra thông tin lead."}
          </p>
        </div>
        <Button onClick={chay} disabled={dangChay} variant={lead ? "outline" : "default"}>
          <Sparkles className="size-4" />
          {dangChay ? "Đang trích xuất…" : lead ? "Trích xuất lại" : "Trích xuất thông tin lead"}
        </Button>
      </div>

      {daCu && (
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 ring-1 ring-inset ring-yellow-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          Hội thoại đã có thêm tin nhắn mới ({soTinNhanHienTai} tin) kể từ lần trích xuất trước (
          {lead.soTinNhanLucTrich} tin). Bấm “Trích xuất lại” để cập nhật.
        </p>
      )}

      {loi && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {loi}
        </p>
      )}

      {lead ? (
        <dl className="grid gap-4 sm:grid-cols-3">
          <Dong nhan="Họ tên" giaTri={lead.ten} />
          <Dong nhan="Email" giaTri={lead.email} />
          <Dong nhan="Số điện thoại" giaTri={lead.soDienThoai} />
          <Dong nhan="Nước du học" giaTri={lead.nuocDuHoc} />
          <Dong nhan="Bậc học" giaTri={lead.bacHoc} />
          <Dong nhan="Ngành học" giaTri={lead.nganhHoc} />
          <Dong nhan="Thời gian rảnh" giaTri={lead.thoiGianRanh} />
          <Dong nhan="Đã đặt lịch tư vấn" giaTri={lead.daDatLich ? "Rồi" : "Chưa"} />
          <div className="sm:col-span-3">
            <dt className="text-xs text-muted-foreground">Ghi chú</dt>
            <dd
              className={cn(
                "mt-0.5 text-sm",
                lead.ghiChu ? "whitespace-pre-wrap" : "text-muted-foreground",
              )}
            >
              {lead.ghiChu ?? "—"}
            </dd>
          </div>
        </dl>
      ) : null}
    </Card>
  );
}
