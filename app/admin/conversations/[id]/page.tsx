import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getConversationDetail, isValidConversationId } from "@/lib/conversations";

// Đọc database theo từng request, không prerender.
export const dynamic = "force-dynamic";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminConversationDetailPage({
  params,
}: PageProps<"/admin/conversations/[id]">) {
  const { id } = await params;

  // Chặn sớm id rác để không đem chuỗi bậy đi truy vấn database.
  if (!isValidConversationId(id)) notFound();

  const conversation = await getConversationDetail(id);
  if (!conversation) notFound();

  const soCauHoi = conversation.messages.filter((m) => m.from === "user").length;

  return (
    <>
      <Link
        href="/admin/conversations"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground duration-150 hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>

      <AdminPageHeader
        title="Chi tiết hội thoại"
        description={`Kênh ${conversation.channel} · ${conversation.messages.length} tin nhắn · ${soCauHoi} câu hỏi của khách`}
      />

      <Card className="mb-6 p-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Bắt đầu</dt>
            <dd className="mt-0.5 font-medium">{formatTime(conversation.startedAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Hoạt động gần nhất</dt>
            <dd className="mt-0.5 font-medium">{formatTime(conversation.lastMessageAt)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Mã hội thoại</dt>
            <dd className="mt-0.5 truncate font-mono text-xs">{conversation.id}</dd>
          </div>
        </dl>
      </Card>

      <Card className="p-5">
        {conversation.messages.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Hội thoại này chưa có tin nhắn nào.
          </p>
        ) : (
          <ol className="space-y-4">
            {conversation.messages.map((m) => (
              <li
                key={m.id}
                className={cn("flex flex-col", m.from === "user" ? "items-end" : "items-start")}
              >
                <div className="mb-1 flex items-center gap-2 px-1 text-xs text-muted-foreground">
                  <span className="font-medium">{m.from === "user" ? "Khách" : "Chatbot"}</span>
                  <span>{formatTime(m.createdAt)}</span>
                </div>
                <div
                  className={cn(
                    "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm",
                    m.from === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  {m.text}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}
