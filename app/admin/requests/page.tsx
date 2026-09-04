import { AdminPageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { RequestStatusBadge } from "@/components/status-badge";
import { NutDuyet } from "@/components/admin/nut-duyet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { danhSachYeuCau, TEN_BAC_HOC } from "@/lib/quote-requests";
import { isSupabaseConfigured } from "@/lib/supabase-server";
import { servicePackages } from "@/lib/mock-data";

// Đọc database theo từng request, không prerender.
export const dynamic = "force-dynamic";

function formatVnd(value: number) {
  return value.toLocaleString("vi-VN") + "₫";
}

function tenGoi(id: string) {
  return servicePackages.find((p) => p.id === id)?.name ?? id;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminRequestsPage() {
  const configured = isSupabaseConfigured();
  const yeuCau = configured ? await danhSachYeuCau() : [];
  const choDuyet = yeuCau.filter((y) => y.trangThai === "cho_duyet").length;

  return (
    <>
      <AdminPageHeader
        title="Yêu cầu"
        description={
          configured
            ? `${yeuCau.length} yêu cầu báo giá gửi từ trang chủ · ${choDuyet} yêu cầu đang chờ duyệt.`
            : "Chưa cấu hình SUPABASE_URL và SUPABASE_SECRET_KEY trong .env."
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên khách</TableHead>
              <TableHead>Liên hệ</TableHead>
              <TableHead>Nguyện vọng</TableHead>
              <TableHead>Gói dịch vụ</TableHead>
              <TableHead>Báo giá</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yeuCau.map((y) => (
              <TableRow key={y.id}>
                <TableCell className="font-medium">{y.tenKhach}</TableCell>
                <TableCell className="text-muted-foreground">
                  <span className="block">{y.email}</span>
                  {y.soDienThoai && <span className="block text-xs">{y.soDienThoai}</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {y.quocGia} · {TEN_BAC_HOC[y.bacHoc]}
                </TableCell>
                <TableCell>{tenGoi(y.goiDichVu)}</TableCell>
                <TableCell className="tabular-nums">{formatVnd(y.gia)}</TableCell>
                <TableCell>
                  <RequestStatusBadge status={y.trangThai} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatTime(y.createdAt)}</TableCell>
                <TableCell>
                  <NutDuyet id={y.id} trangThai={y.trangThai} />
                </TableCell>
              </TableRow>
            ))}

            {yeuCau.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  {configured
                    ? "Chưa có yêu cầu báo giá nào."
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
