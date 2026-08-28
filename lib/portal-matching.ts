import "server-only";

import { docGiayTo } from "@/lib/student-profile";
import { listSchools, type SchoolRow } from "@/lib/schools-db";
import type { TrichXuatBangDiem, TrichXuatIelts } from "@/lib/document-extraction";

export interface KetQuaDoiChieu {
  gpa: number | null;
  ielts: number | null;
  /** Đủ điểm để đối chiếu (có cả điểm học tập lẫn IELTS). */
  daDuDiem: boolean;
  doiChieu: { school: SchoolRow; passed: boolean }[];
  /** Tên các trường học viên đạt yêu cầu. */
  truongDat: string[];
}

/**
 * Đối chiếu hồ sơ học viên với điểm chuẩn các trường.
 *
 * Dùng chung cho trang /portal và cho Server Action gợi ý học bổng — action
 * KHÔNG nhận điểm hay danh sách trường từ client mà tự tính lại ở đây, để khách
 * không thể tự khai điểm cao rồi đòi gợi ý học bổng.
 */
export async function doiChieuHoSo(profileId: string): Promise<KetQuaDoiChieu> {
  const giayTo = await docGiayTo(profileId);
  const bd = giayTo.find((g) => g.loai === "bang_diem")?.trichXuat as
    | TrichXuatBangDiem
    | null
    | undefined;
  const il = giayTo.find((g) => g.loai === "ielts")?.trichXuat as
    | TrichXuatIelts
    | null
    | undefined;

  const gpa = bd?.diemTongKet ?? null;
  const ielts = il?.diemTong ?? null;
  const daDuDiem = gpa !== null && ielts !== null;

  if (gpa === null || ielts === null) {
    return { gpa, ielts, daDuDiem: false, doiChieu: [], truongDat: [] };
  }

  const truong = await listSchools();
  const doiChieu = truong
    .filter((s) => s.minGpa !== null && s.minIelts !== null)
    .map((s) => ({
      school: s,
      passed: gpa >= (s.minGpa as number) && ielts >= (s.minIelts as number),
    }))
    // Trường đạt lên trước cho dễ nhìn.
    .sort((a, b) => Number(b.passed) - Number(a.passed));

  return {
    gpa,
    ielts,
    daDuDiem,
    doiChieu,
    truongDat: doiChieu.filter((m) => m.passed).map((m) => m.school.name),
  };
}
