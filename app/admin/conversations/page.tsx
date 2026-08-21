import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listConversations } from "@/lib/conversations";
import { docChatLuongTheoHoiThoai } from "@/lib/leads";
import { HuyHieuChatLuong } from "@/components/admin/lead-panel";
import { isSupabaseConfigured } from "@/lib/supabase-server";

// Server Component: truy vấn chạy trên server bằng secret key, dữ liệu render sẵn
// thành HTML rồi mới gửi xuống. Trình duyệt không hề gọi Supabase.
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

export default async function AdminConversationsPage() {
  const configured = isSupabaseConfigured();
  const conversations = configured ? await listConversations() : [];
  const chatLuong = await docChatLuongTheoHoiThoai(conversations.map((c) => c.id));

  return (
    <>
      <AdminPageHeader
        title="Hội thoại"
        description="Lịch sử hội thoại của khách với chatbot hỏi đáp trên trang chủ, đọc trực tiếp từ database."
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kênh</TableHead>
              <TableHead>Câu hỏi đầu tiên</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Số tin nhắn</TableHead>
              <TableHead>Bắt đầu</TableHead>
              <TableHead>Gần nhất</TableHead>
              <TableHead className="text-right">Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversations.map((conv) => (
              <TableRow key={conv.id}>
                <TableCell className="font-medium">{conv.channel}</TableCell>
                <TableCell className="max-w-xs">
                  <span className="line-clamp-1 text-muted-foreground">
                    {conv.preview ?? "—"}
                  </span>
                </TableCell>
                <TableCell>
                  {chatLuong.has(conv.id) ? (
                    <HuyHieuChatLuong chatLuong={chatLuong.get(conv.id)!} />
                  ) : (
                    <span className="text-xs text-muted-foreground">chưa trích xuất</span>
                  )}
                </TableCell>
                <TableCell>{conv.messageCount}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTime(conv.startedAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTime(conv.lastMessageAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/admin/conversations/${conv.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Xem
                    <ChevronRight className="size-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}

            {conversations.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {configured
                    ? "Chưa có hội thoại nào."
                    : "Chưa cấu hình SUPABASE_URL và SUPABASE_SECRET_KEY trong .env."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
