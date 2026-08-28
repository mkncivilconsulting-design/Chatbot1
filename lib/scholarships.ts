import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-server";

export interface HocBong {
  id: string;
  schoolId: string;
  /** Tên trường áp dụng, lấy kèm khi join để khỏi phải truy vấn thêm. */
  tenTruong: string;
  quocGia: string;
  ten: string;
  /** Điều kiện dạng số để đối chiếu được. null = học bổng không yêu cầu tiêu chí đó. */
  minGpa: number | null;
  minIelts: number | null;
  /** Bản mô tả điều kiện cho người đọc. */
  dieuKien: string;
  /** 100 = toàn phần. null = không quy ra phần trăm được. */
  hoTroPhanTram: number | null;
  hoTroMoTa: string;
}

/** numeric của Postgres về dạng chuỗi qua PostgREST, phải tự đổi sang số. */
function soHoacNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function danhSachHocBong(): Promise<HocBong[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db
    .from("scholarships")
    .select(
      "id, school_id, ten, min_gpa, min_ielts, dieu_kien, ho_tro_phan_tram, ho_tro_mo_ta, schools(name, country)",
    )
    .order("ho_tro_phan_tram", { ascending: false, nullsFirst: false })
    .order("ten", { ascending: true });

  if (error) {
    console.error("[scholarships] Không đọc được danh sách học bổng:", error.message);
    return [];
  }

  return (data ?? []).map((r) => {
    // PostgREST trả quan hệ 1-1 dưới dạng object, nhưng kiểu suy ra có thể là mảng.
    const truong = r.schools as unknown as { name?: string; country?: string } | null;
    return {
      id: r.id as string,
      schoolId: r.school_id as string,
      tenTruong: truong?.name ?? "—",
      quocGia: truong?.country ?? "—",
      ten: r.ten as string,
      minGpa: soHoacNull(r.min_gpa),
      minIelts: soHoacNull(r.min_ielts),
      dieuKien: r.dieu_kien as string,
      hoTroPhanTram: soHoacNull(r.ho_tro_phan_tram),
      hoTroMoTa: r.ho_tro_mo_ta as string,
    };
  });
}

/**
 * Lọc những học bổng mà học viên đủ điều kiện.
 * Điểm nào chưa có thì coi như KHÔNG đạt tiêu chí đó — thà bỏ sót còn hơn báo
 * đủ điều kiện rồi khách nộp hồ sơ mới biết là không.
 */
export function locHocBongPhuHop(
  danhSach: HocBong[],
  gpa: number | null,
  ielts: number | null,
): HocBong[] {
  return danhSach.filter((hb) => {
    if (hb.minGpa !== null && (gpa === null || gpa < hb.minGpa)) return false;
    if (hb.minIelts !== null && (ielts === null || ielts < hb.minIelts)) return false;
    return true;
  });
}
