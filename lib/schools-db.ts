import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-server";

export interface SchoolRow {
  id: string;
  name: string;
  country: string;
  state: string | null;
  go8: boolean;
  minGpa: number | null;
  minIelts: number | null;
  auRank: number | null;
  theRank2026: string | null;
}

/**
 * Postgres kiểu numeric trả về dạng CHUỖI qua PostgREST (để không mất độ chính xác),
 * nên phải tự đổi sang số — nếu không thì `minGpa.toFixed(1)` sẽ nổ.
 */
function soHoacNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Danh sách trường tham chiếu, đọc từ Supabase.
 *
 * Bảng `schools` là dữ liệu CÔNG KHAI (có policy cho anon đọc), khác với
 * conversations/messages/leads. Ở đây vẫn dùng client phía server cho nhất quán
 * và để sau này còn sửa được dữ liệu.
 */
export async function listSchools(): Promise<SchoolRow[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db
    .from("schools")
    .select("id, name, country, state, go8, min_gpa, min_ielts, au_rank, the_rank_2026")
    // Trường đã có hạng lên trước theo thứ tự hạng, chưa có hạng xuống cuối.
    .order("au_rank", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("[schools] Không đọc được danh sách trường:", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    country: r.country as string,
    state: (r.state as string | null) ?? null,
    go8: Boolean(r.go8),
    minGpa: soHoacNull(r.min_gpa),
    minIelts: soHoacNull(r.min_ielts),
    auRank: soHoacNull(r.au_rank),
    theRank2026: (r.the_rank_2026 as string | null) ?? null,
  }));
}
