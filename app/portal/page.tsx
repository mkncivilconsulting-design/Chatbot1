import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { UploadGiayTo } from "@/components/portal/upload-giay-to";
import { ThongTinTrichXuat } from "@/components/portal/thong-tin-trich-xuat";
import { SchoolMatch } from "@/components/portal/school-match";
import { docMaHoSo } from "@/app/portal/actions";
import { GoiYHocBong } from "@/components/portal/goi-y-hoc-bong";
import { docGiayTo, type GiayToDaNop } from "@/lib/student-profile";
import { doiChieuHoSo } from "@/lib/portal-matching";
import { docGoiY } from "@/lib/scholarship-advisor";
import { isSupabaseConfigured } from "@/lib/supabase-server";
import type { TrichXuatBangDiem, TrichXuatGiayTo } from "@/lib/document-extraction";

// Đọc cookie + database theo từng request, không prerender.
export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const configured = isSupabaseConfigured();
  const profileId = configured ? await docMaHoSo() : null;
  const giayTo = profileId ? await docGiayTo(profileId) : [];

  const tim = (loai: GiayToDaNop["loai"]) => giayTo.find((g) => g.loai === loai) ?? null;
  const bangDiem = tim("bang_diem");
  const ielts = tim("ielts");
  const giayToTuyThan = tim("giay_to_tuy_than");

  const bd = bangDiem?.trichXuat as TrichXuatBangDiem | null | undefined;
  const gt = giayToTuyThan?.trichXuat as TrichXuatGiayTo | null | undefined;

  // Tên lấy từ bảng điểm, không có thì lấy từ giấy tờ tuỳ thân.
  const hoTen = bd?.hoTen ?? gt?.hoTen ?? null;

  // Đối chiếu điểm chuẩn dùng chung một hàm với Server Action gợi ý học bổng,
  // để hai bên không bao giờ tính ra kết quả khác nhau.
  const ketDoiChieu = profileId
    ? await doiChieuHoSo(profileId)
    : { gpa: null, ielts: null, daDuDiem: false, doiChieu: [], truongDat: [] };
  const { gpa, ielts: bandIelts, daDuDiem, doiChieu, truongDat } = ketDoiChieu;
  const soTruongDat = truongDat.length;

  const goiY = profileId ? await docGoiY(profileId) : null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-32">
        <div className="border-b pb-6">
          <p className="text-sm text-muted-foreground">Xin chào,</p>
          <h1 className="text-2xl font-medium tracking-tight">{hoTen ?? "bạn"}</h1>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-medium">Giấy tờ cần nộp</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nộp đủ 3 loại giấy tờ dưới đây. Hệ thống sẽ tự đọc và trích xuất thông tin, sau đó đối
            chiếu điểm chuẩn giúp bạn. Mỗi file tối đa 10MB.
          </p>

          {!configured && (
            <p className="mt-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 ring-1 ring-inset ring-yellow-200">
              Chức năng nộp hồ sơ chưa được cấu hình. Vui lòng liên hệ quản trị viên.
            </p>
          )}

          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <UploadGiayTo
              loai="bang_diem"
              tieuDe="Bảng điểm"
              moTa="Chấp nhận file PDF"
              accept="application/pdf"
              daNop={bangDiem}
            />
            <UploadGiayTo
              loai="ielts"
              tieuDe="Chứng chỉ IELTS"
              moTa="Ảnh chụp, chấp nhận JPG, PNG, WEBP"
              accept="image/jpeg,image/png,image/webp"
              daNop={ielts}
            />
            <UploadGiayTo
              loai="giay_to_tuy_than"
              tieuDe="CMND/CCCD hoặc hộ chiếu"
              moTa="Ảnh chụp, chấp nhận JPG, PNG, WEBP"
              accept="image/jpeg,image/png,image/webp"
              daNop={giayToTuyThan}
            />
          </div>
        </section>

        <section className="mt-12 space-y-6">
          <ThongTinTrichXuat bangDiem={bangDiem} ielts={ielts} giayToTuyThan={giayToTuyThan} />

          {daDuDiem ? (
            <div>
              <p className="mb-3 text-sm text-muted-foreground">
                So điểm học tập <strong className="text-foreground">{gpa}</strong> và IELTS{" "}
                <strong className="text-foreground">{bandIelts}</strong> của bạn với{" "}
                {doiChieu.length} trường đã có điểm chuẩn — bạn đủ điều kiện vào{" "}
                <strong className="text-foreground">{soTruongDat}</strong> trường.
              </p>
              <SchoolMatch matches={doiChieu} />
            </div>
          ) : null}

          <GoiYHocBong
            goiY={goiY}
            soTruongDat={soTruongDat}
            sanSang={daDuDiem && soTruongDat > 0}
          />

          {!daDuDiem && (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nộp cả bảng điểm và chứng chỉ IELTS để hệ thống đối chiếu điểm chuẩn giúp bạn.
            </p>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
