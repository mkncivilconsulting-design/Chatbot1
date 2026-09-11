import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { DocStatusBadge } from "@/components/status-badge";
import { ThongTinTrichXuat } from "@/components/portal/thong-tin-trich-xuat";
import { DuyetGiayTo } from "@/components/admin/duyet-giay-to";
import { NutXoa } from "@/components/admin/nut-xac-nhan";
import { chiTietHoSo } from "@/lib/admin-profiles";
import { batBuocQuanTri } from "@/lib/dal";
import { taoClientAuth } from "@/lib/supabase-auth";
import { laMaHoSoHopLe } from "@/lib/student-profile";
import { TEN_LOAI, type LoaiGiayTo } from "@/lib/document-extraction";
import { xoaHoSoAction } from "@/app/admin/profiles/actions";

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

export default async function AdminProfileDetailPage({
  params,
}: PageProps<"/admin/profiles/[id]">) {
  const { id } = await params;
  const taiKhoan = await batBuocQuanTri(`/admin/profiles/${id}`);
  const laAdmin = taiKhoan.vaiTro === "admin";

  if (!laMaHoSoHopLe(id)) notFound();
  const hoSo = await chiTietHoSo(await taoClientAuth(), id);
  if (!hoSo) notFound();

  const tim = (loai: LoaiGiayTo) => hoSo.giayTo.find((g) => g.loai === loai) ?? null;

  return (
    <>
      <Link
        href="/admin/profiles"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground duration-150 hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>

      <AdminPageHeader
        title="Chi tiết hồ sơ"
        description={`${hoSo.email ?? "Chưa rõ email"} · tạo ${formatTime(hoSo.taoLuc)} · cập nhật ${formatTime(hoSo.capNhatLuc)}`}
        action={
          // Nhân viên chỉ xem: không render nút xoá.
          laAdmin ? (
            <NutXoa
              nhan="Xoá hồ sơ"
              cauHoi="Xoá cả hồ sơ, toàn bộ giấy tờ và file gốc?"
              hanhDong={xoaHoSoAction.bind(null, hoSo.id)}
            />
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {LOAI.map((loai) => {
          const g = tim(loai);
          return (
            <Card key={loai} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{TEN_LOAI[loai]}</p>
                <DocStatusBadge status={g?.trangThai ?? "chua_nop"} />
              </div>
              {g ? (
                <>
                  <p className="mt-2 truncate text-xs text-muted-foreground" title={g.tenFile}>
                    {g.tenFile} · {formatTime(g.taiLenLuc)}
                  </p>
                  {g.lyDo && (
                    <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700 ring-1 ring-inset ring-red-200">
                      {g.lyDo}
                    </p>
                  )}
                  {laAdmin && (
                    <DuyetGiayTo
                      profileId={hoSo.id}
                      loai={loai}
                      trangThai={g.trangThai}
                      lyDo={g.lyDo}
                    />
                  )}
                </>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Học viên chưa nộp.</p>
              )}
            </Card>
          );
        })}
      </div>

      <ThongTinTrichXuat
        bangDiem={tim("bang_diem")}
        ielts={tim("ielts")}
        giayToTuyThan={tim("giay_to_tuy_than")}
      />
    </>
  );
}
