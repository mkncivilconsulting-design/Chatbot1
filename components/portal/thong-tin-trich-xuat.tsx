import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  TrichXuatBangDiem,
  TrichXuatGiayTo,
  TrichXuatIelts,
} from "@/lib/document-extraction";
import type { GiayToDaNop } from "@/lib/student-profile";

function O({ nhan, giaTri }: { nhan: string; giaTri: string | number | null }) {
  const rong = giaTri === null || giaTri === "";
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{nhan}</dt>
      <dd className={cn("mt-0.5 text-sm", rong ? "text-muted-foreground" : "font-medium")}>
        {rong ? "Chưa đọc được" : giaTri}
      </dd>
    </div>
  );
}

function Nhom({
  tieuDe,
  giayTo,
  children,
}: {
  tieuDe: string;
  giayTo: GiayToDaNop | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">{tieuDe}</h3>
      {giayTo ? (
        <dl className="grid gap-4 sm:grid-cols-3">{children}</dl>
      ) : (
        <p className="text-sm text-muted-foreground">Chưa nộp giấy tờ này.</p>
      )}
    </div>
  );
}

export function ThongTinTrichXuat({
  bangDiem,
  ielts,
  giayToTuyThan,
}: {
  bangDiem: GiayToDaNop | null;
  ielts: GiayToDaNop | null;
  giayToTuyThan: GiayToDaNop | null;
}) {
  const bd = bangDiem?.trichXuat as TrichXuatBangDiem | null | undefined;
  const il = ielts?.trichXuat as TrichXuatIelts | null | undefined;
  const gt = giayToTuyThan?.trichXuat as TrichXuatGiayTo | null | undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin đã trích xuất</CardTitle>
        <p className="text-sm text-muted-foreground">
          Đây là thông tin hệ thống đọc được từ giấy tờ bạn đã nộp. Bạn kiểm tra lại xem có đúng
          không nhé — sai chỗ nào thì nộp lại ảnh rõ hơn.
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        <Nhom tieuDe="Từ bảng điểm" giayTo={bangDiem}>
          <O nhan="Họ tên" giaTri={bd?.hoTen ?? null} />
          <O nhan="Ngày sinh" giaTri={bd?.ngaySinh ?? null} />
          <O nhan="Điểm học tập tổng kết" giaTri={bd?.diemTongKet ?? null} />
        </Nhom>

        <Nhom tieuDe="Từ chứng chỉ IELTS" giayTo={ielts}>
          <O nhan="Họ tên trên chứng chỉ" giaTri={il?.hoTen ?? null} />
          <O nhan="Ngày thi" giaTri={il?.ngayThi ?? null} />
          <O nhan="Điểm tổng (Overall)" giaTri={il?.diemTong ?? null} />
          <O nhan="Nghe (Listening)" giaTri={il?.nghe ?? null} />
          <O nhan="Đọc (Reading)" giaTri={il?.doc ?? null} />
          <O nhan="Viết (Writing)" giaTri={il?.viet ?? null} />
          <O nhan="Nói (Speaking)" giaTri={il?.noi ?? null} />
        </Nhom>

        <Nhom tieuDe="Từ CMND/CCCD hoặc hộ chiếu" giayTo={giayToTuyThan}>
          <O nhan="Họ tên" giaTri={gt?.hoTen ?? null} />
          <O nhan="Ngày sinh" giaTri={gt?.ngaySinh ?? null} />
          <O nhan="Số giấy tờ" giaTri={gt?.soGiayTo ?? null} />
        </Nhom>
      </CardContent>
    </Card>
  );
}
