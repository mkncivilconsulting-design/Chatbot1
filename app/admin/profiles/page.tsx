import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { StatusDot, docStatusMeta } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { danhSachHoSo } from "@/lib/admin-profiles";
import { batBuocQuanTri } from "@/lib/dal";
import { taoClientAuth } from "@/lib/supabase-auth";
import { isSupabaseConfigured } from "@/lib/supabase-server";
import { TEN_LOAI, type LoaiGiayTo } from "@/lib/document-extraction";

// Đọc database theo từng request bằng phiên của nhân sự đang đăng nhập (RLS).
export const dynamic = "force-dynamic";

const LOAI: LoaiGiayTo[] = ["bang_diem", "ielts", "giay_to_tuy_than"];

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminProfilesPage() {
  await batBuocQuanTri("/admin/profiles");

  const configured = isSupabaseConfigured();
  const hoSo = configured ? await danhSachHoSo(await taoClientAuth()) : [];

  return (
    <>
      <AdminPageHeader
        title="Hồ sơ học viên"
        description="Giấy tờ học viên đã nộp trong cổng hồ sơ và trạng thái duyệt của từng loại."
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Học viên</TableHead>
              <TableHead>3 giấy tờ</TableHead>
              <TableHead>Cập nhật</TableHead>
              <TableHead className="text-right">Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hoSo.map((h) => (
              <TableRow key={h.id}>
                <TableCell>
                  <span className="block font-medium">{h.hoTen ?? "Chưa rõ tên"}</span>
                  <span className="block text-xs text-muted-foreground">{h.email ?? "—"}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {LOAI.map((loai) => {
                      const status = h.giayTo[loai] ?? "chua_nop";
                      return (
                        <span
                          key={loai}
                          title={`${TEN_LOAI[loai]}: ${docStatusMeta[status].label}`}
                          className="flex items-center"
                        >
                          <StatusDot tone={docStatusMeta[status].tone} />
                        </span>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatTime(h.capNhatLuc)}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/admin/profiles/${h.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Xem
                    <ChevronRight className="size-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}

            {hoSo.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  {configured ? "Chưa có học viên nào nộp hồ sơ." : "Chưa cấu hình Supabase trong .env."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
