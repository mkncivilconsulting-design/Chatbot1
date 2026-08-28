import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { DuLieuTrichXuat, LoaiGiayTo } from "@/lib/document-extraction";
import type { DocStatus } from "@/lib/mock-data";

const BUCKET = "ho-so";

export interface GiayToDaNop {
  loai: LoaiGiayTo;
  tenFile: string;
  mime: string;
  kichThuoc: number;
  trangThai: DocStatus;
  lyDo: string | null;
  trichXuat: DuLieuTrichXuat | null;
  taiLenLuc: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function laMaHoSoHopLe(id: unknown): id is string {
  return typeof id === "string" && UUID_RE.test(id);
}

export async function taoHoSo(): Promise<string | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("student_profiles")
    .insert({})
    .select("id")
    .single();

  if (error) {
    console.error("[student-profile] Không tạo được hồ sơ:", error.message);
    return null;
  }
  return data.id as string;
}

export async function hoSoTonTai(id: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;

  const { data, error } = await db
    .from("student_profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[student-profile] Không kiểm tra được hồ sơ:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function docGiayTo(profileId: string): Promise<GiayToDaNop[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db
    .from("student_documents")
    .select("loai, ten_file, mime, kich_thuoc, trang_thai, ly_do, trich_xuat, tai_len_luc")
    .eq("profile_id", profileId);

  if (error) {
    console.error("[student-profile] Không đọc được giấy tờ:", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    loai: r.loai as LoaiGiayTo,
    tenFile: r.ten_file as string,
    mime: r.mime as string,
    kichThuoc: r.kich_thuoc as number,
    trangThai: r.trang_thai as DocStatus,
    lyDo: (r.ly_do as string | null) ?? null,
    trichXuat: (r.trich_xuat as DuLieuTrichXuat | null) ?? null,
    taiLenLuc: r.tai_len_luc as string,
  }));
}

/**
 * Đưa file gốc vào bucket private. Trả về đường dẫn, hoặc null nếu lưu hỏng.
 * Lưu hỏng KHÔNG chặn luồng: thông tin đã trích xuất vẫn được ghi lại.
 */
export async function luuFileGoc(
  profileId: string,
  loai: LoaiGiayTo,
  bytes: Uint8Array,
  mime: string,
): Promise<string | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const duoi = mime === "application/pdf" ? "pdf" : mime.split("/")[1] || "bin";
  const duongDan = `${profileId}/${loai}.${duoi}`;

  const { error } = await db.storage
    .from(BUCKET)
    .upload(duongDan, bytes, { contentType: mime, upsert: true });

  if (error) {
    console.error("[student-profile] Không lưu được file:", error.message);
    return null;
  }
  return duongDan;
}

export async function luuGiayTo(
  profileId: string,
  loai: LoaiGiayTo,
  thongTin: {
    tenFile: string;
    mime: string;
    kichThuoc: number;
    duongDanLuu: string | null;
    trangThai: DocStatus;
    lyDo: string | null;
    trichXuat: DuLieuTrichXuat | null;
  },
): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;

  const { error } = await db.from("student_documents").upsert(
    {
      profile_id: profileId,
      loai,
      ten_file: thongTin.tenFile,
      mime: thongTin.mime,
      kich_thuoc: thongTin.kichThuoc,
      duong_dan_luu: thongTin.duongDanLuu,
      trang_thai: thongTin.trangThai,
      ly_do: thongTin.lyDo,
      trich_xuat: thongTin.trichXuat,
      tai_len_luc: new Date().toISOString(),
    },
    { onConflict: "profile_id,loai" },
  );

  if (error) {
    console.error("[student-profile] Không lưu được giấy tờ:", error.message);
    return false;
  }

  await db
    .from("student_profiles")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", profileId);

  return true;
}
