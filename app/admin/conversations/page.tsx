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
import { isSupabaseConfigured } from "@/lib/supabase-server";

// Đây là Server Component: truy vấn chạy trên server bằng secret key, dữ liệu đã
// render sẵn thành HTML mới gửi xuống. Trình duyệt không hề gọi Supabase.
// Có `cookies()`/dữ liệu động phía dưới nên trang luôn render theo từng request.
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
              <TableHead>Số tin nhắn</TableHead>
              <TableHead>Bắt đầu</TableHead>
              <TableHead>Hoạt động gần nhất</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversations.map((conv) => (
              <TableRow key={conv.id}>
                <TableCell className="font-medium">{conv.channel}</TableCell>
                <TableCell>{conv.messageCount} tin nhắn</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTime(conv.startedAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTime(conv.lastMessageAt)}
                </TableCell>
              </TableRow>
            ))}

            {conversations.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
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
