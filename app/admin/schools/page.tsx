import { Pencil, Plus, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { schools } from "@/lib/mock-data";

// Xếp trường đã có hạng lên trước theo thứ tự hạng, trường chưa có hạng xuống cuối.
// Dùng bản sao để không đụng vào thứ tự mảng gốc — currentStudent.matches trỏ theo index.
const danhSach = [...schools].sort((a, b) => {
  if (a.auRank === null && b.auRank === null) return 0;
  if (a.auRank === null) return 1;
  if (b.auRank === null) return -1;
  return a.auRank - b.auRank;
});

export default function AdminSchoolsPage() {
  return (
    <>
      <AdminPageHeader
        title="Trường tham chiếu"
        description="Điểm chuẩn để đối chiếu hồ sơ, kèm xếp hạng THE World University Rankings 2026."
        action={
          <Button>
            <Plus className="size-4" />
            Thêm trường mới
          </Button>
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Hạng Úc</TableHead>
              <TableHead>Tên trường</TableHead>
              <TableHead>Quốc gia</TableHead>
              <TableHead>Bang</TableHead>
              <TableHead>Hạng thế giới (THE 2026)</TableHead>
              <TableHead>Điểm học tập tối thiểu</TableHead>
              <TableHead>Điểm IELTS tối thiểu</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {danhSach.map((school) => (
              <TableRow key={school.id}>
                <TableCell className="tabular-nums text-muted-foreground">
                  {school.auRank ?? "—"}
                </TableCell>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    {school.name}
                    {school.go8 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                        Go8
                      </span>
                    )}
                  </span>
                </TableCell>
                <TableCell>{school.country}</TableCell>
                <TableCell className="text-muted-foreground">{school.state ?? "—"}</TableCell>
                <TableCell className="tabular-nums">{school.theRank2026 ?? "—"}</TableCell>
                <TableCell className={school.minGpa === null ? "text-muted-foreground" : undefined}>
                  {school.minGpa === null ? "Chưa có" : school.minGpa.toFixed(1)}
                </TableCell>
                <TableCell className={school.minIelts === null ? "text-muted-foreground" : undefined}>
                  {school.minIelts === null ? "Chưa có" : school.minIelts.toFixed(1)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button size="icon-sm" variant="outline" aria-label="Sửa">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="outline" aria-label="Xoá">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
