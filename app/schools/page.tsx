import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { listSchools } from "@/lib/schools-db";
import { danhSachHocBong } from "@/lib/scholarships";
import { isSupabaseConfigured } from "@/lib/supabase-server";

// Đọc database theo từng request, không prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Điểm chuẩn trường — DuHoc24",
  description:
    "Danh sách trường tham chiếu kèm điểm học tập và điểm IELTS tối thiểu, dùng để đối chiếu hồ sơ du học.",
};

export default async function SchoolsPage({ searchParams }: PageProps<"/schools">) {
  const { nuoc } = await searchParams;
  const nuocDangChon = typeof nuoc === "string" ? nuoc : null;

  const configured = isSupabaseConfigured();
  const tatCa = configured ? await listSchools() : [];

  const danhSachNuoc = [...new Set(tatCa.map((s) => s.country))].sort((a, b) =>
    a.localeCompare(b, "vi"),
  );
  const danhSach = nuocDangChon
    ? tatCa.filter((s) => s.country === nuocDangChon)
    : tatCa;
  const coDiemChuan = danhSach.filter((s) => s.minGpa !== null && s.minIelts !== null).length;

  const tatCaHocBong = configured ? await danhSachHocBong() : [];
  const hocBong = nuocDangChon
    ? tatCaHocBong.filter((h) => h.quocGia === nuocDangChon)
    : tatCaHocBong;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-32">
        <h1 className="text-balance text-3xl font-medium tracking-tight md:text-4xl">
          Điểm chuẩn trường
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Điểm học tập tối thiểu (thang 10) và điểm IELTS tối thiểu để hồ sơ được xét. Nộp hồ sơ
          trong{" "}
          <Link href="/portal" className="underline underline-offset-4 hover:text-foreground">
            cổng hồ sơ
          </Link>{" "}
          để hệ thống tự đối chiếu điểm của bạn với từng trường.
        </p>

        {configured && (
          <p className="mt-2 text-sm text-muted-foreground">
            {danhSach.length} trường{nuocDangChon ? ` ở ${nuocDangChon}` : ""} ·{" "}
            {coDiemChuan} trường đã có điểm chuẩn.
          </p>
        )}

        {danhSachNuoc.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/schools"
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm duration-150",
                nuocDangChon === null
                  ? "border-primary bg-accent font-medium text-accent-foreground"
                  : "border-input text-muted-foreground hover:bg-muted/50",
              )}
            >
              Tất cả
            </Link>
            {danhSachNuoc.map((n) => (
              <Link
                key={n}
                href={`/schools?nuoc=${encodeURIComponent(n)}`}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm duration-150",
                  nuocDangChon === n
                    ? "border-primary bg-accent font-medium text-accent-foreground"
                    : "border-input text-muted-foreground hover:bg-muted/50",
                )}
              >
                {n}
              </Link>
            ))}
          </div>
        )}

        <Card className="mt-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trường</TableHead>
                <TableHead>Quốc gia</TableHead>
                <TableHead className="text-right">Điểm học tập tối thiểu</TableHead>
                <TableHead className="text-right">IELTS tối thiểu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {danhSach.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <span className="flex flex-wrap items-center gap-2">
                      {s.name}
                      {s.go8 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                          Go8
                        </span>
                      )}
                    </span>
                    {s.theRank2026 && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Hạng thế giới {s.theRank2026} (THE 2026)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.country}
                    {s.state ? ` · ${s.state}` : ""}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      s.minGpa === null && "text-muted-foreground",
                    )}
                  >
                    {s.minGpa === null ? "Chưa cập nhật" : s.minGpa.toFixed(1)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      s.minIelts === null && "text-muted-foreground",
                    )}
                  >
                    {s.minIelts === null ? "Chưa cập nhật" : s.minIelts.toFixed(1)}
                  </TableCell>
                </TableRow>
              ))}

              {danhSach.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    {configured
                      ? "Chưa có trường nào trong danh sách."
                      : "Danh sách trường đang được cập nhật, bạn quay lại sau nhé."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <p className="mt-6 text-sm text-muted-foreground">
          Trường ghi “Chưa cập nhật” là bên mình chưa có số liệu điểm chuẩn, chưa dùng để đối chiếu
          tự động được. Bạn để lại liên hệ trong form báo giá để tư vấn viên kiểm tra giúp nhé.
        </p>

        <section className="mt-16">
          <h2 className="text-2xl font-medium tracking-tight">Học bổng</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Học bổng hiện có theo từng trường{nuocDangChon ? ` ở ${nuocDangChon}` : ""}. Nộp hồ sơ
            trong{" "}
            <Link href="/portal" className="underline underline-offset-4 hover:text-foreground">
              cổng hồ sơ
            </Link>{" "}
            để biết bạn đủ điều kiện học bổng nào.
          </p>

          <Card className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Học bổng</TableHead>
                  <TableHead>Trường áp dụng</TableHead>
                  <TableHead>Điều kiện tối thiểu</TableHead>
                  <TableHead className="text-right">Mức hỗ trợ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hocBong.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.ten}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {h.tenTruong}
                      {h.quocGia ? ` · ${h.quocGia}` : ""}
                    </TableCell>
                    <TableCell>{h.dieuKien}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                          h.hoTroPhanTram === 100
                            ? "bg-green-100 text-green-700 ring-green-200"
                            : "bg-muted text-foreground ring-border",
                        )}
                      >
                        {h.hoTroMoTa}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}

                {hocBong.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      {configured
                        ? `Chưa có học bổng nào${nuocDangChon ? ` cho trường ở ${nuocDangChon}` : ""}.`
                        : "Danh sách học bổng đang được cập nhật, bạn quay lại sau nhé."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
