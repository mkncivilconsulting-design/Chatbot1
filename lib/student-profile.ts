import "server-only";

import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-server";

// HAI LOẠI CLIENT, HAI VIỆC KHÁC NHAU:
//
// - ĐỌC hồ sơ cho học viên xem → dùng client của chính người đăng nhập
//   (taoClientAuth trong lib/supabase-auth.ts). Truy vấn chạy dưới role
//   `authenticated`, nên RLS của database tự lọc: dù code có truyền nhầm id hồ
//   sơ của người khác, database cũng trả về rỗng.
// - GHI (tạo hồ sơ, lưu giấy tờ, kết quả trích xuất) → secret key. Role
//   `authenticated` cố ý không có quyền ghi, để học viên không tự sửa điểm hay
//   tự đánh dấu giấy tờ hợp lệ.
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

// Cookie hồ sơ ẩn danh từ trước khi có đăng nhập. Không còn cấp quyền gì — chỉ
// dùng một lần để tài khoản mới nhận lại hồ sơ cũ (xem layHoSoCuaNguoiDung).
const COOKIE_HO_SO_CU = "duhoc24_sid";

export async function docMaHoSoCu(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_HO_SO_CU)?.value;
  return laMaHoSoHopLe(raw) ? raw : null;
}

/**
 * Id hồ sơ của người đang đăng nhập — ĐỌC QUA RLS.
 *
 * `dbNguoiDung` là client của chính người đó (taoClientAuth). Điều kiện
 * `user_id` ở đây chỉ để Postgres dùng index; thứ thật sự chặn là policy RLS
 * "hoc vien chi xem ho so cua minh".
 */
export async function timHoSoCuaToi(
  dbNguoiDung: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await dbNguoiDung
    .from("student_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[student-profile] Không đọc được hồ sơ:", error.message);
    return null;
  }
  return (data?.id as string | undefined) ?? null;
}

/**
 * Nhận hồ sơ ẩn danh cũ (từ trước khi có đăng nhập) về tài khoản này, nếu hồ sơ
 * đó chưa thuộc về ai. Trả về id hồ sơ đã nhận, hoặc null.
 *
 * Điều kiện user_id is null nằm ngay trong câu UPDATE, nên hai tài khoản không
 * thể cùng nhận một hồ sơ cũ.
 */
export async function nhanHoSoCu(userId: string, maHoSoCu: string | null): Promise<string | null> {
  const db = getSupabaseAdmin();
  if (!db || !laMaHoSoHopLe(maHoSoCu)) return null;

  const { data } = await db
    .from("student_profiles")
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq("id", maHoSoCu)
    .is("user_id", null)
    .select("id")
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/**
 * Hồ sơ để GHI dữ liệu vào (dùng trong Server Action nộp giấy tờ).
 *
 * - Đã có hồ sơ gắn với tài khoản → trả về luôn.
 * - Chưa có → nhận hồ sơ ẩn danh cũ nếu có (xem nhanHoSoCu).
 * - Vẫn chưa có và `taoMoi` = true → tạo hồ sơ mới.
 *
 * Chạy bằng secret key vì có thể phải tạo/cập nhật hồ sơ. `userId` PHẢI lấy từ
 * lib/dal.ts (đã xác thực với Supabase), không bao giờ lấy từ dữ liệu trình
 * duyệt gửi lên.
 */
export async function layHoSoCuaNguoiDung(
  userId: string,
  {
    maHoSoCu = null,
    taoMoi = false,
    email = null,
  }: { maHoSoCu?: string | null; taoMoi?: boolean; email?: string | null } = {},
): Promise<string | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data: coSan, error } = await db
    .from("student_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[student-profile] Không đọc được hồ sơ:", error.message);
    return null;
  }
  if (coSan) return coSan.id as string;

  const daNhan = await nhanHoSoCu(userId, maHoSoCu);
  if (daNhan) return daNhan;

  if (!taoMoi) return null;

  // Lưu kèm email để trang quản trị biết hồ sơ này của ai (bảng auth.users
  // không mở ra API nên không join được).
  const { data: moi, error: loiTao } = await db
    .from("student_profiles")
    .insert({ user_id: userId, email })
    .select("id")
    .single();

  if (loiTao) {
    console.error("[student-profile] Không tạo được hồ sơ:", loiTao.message);
    return null;
  }
  return moi.id as string;
}

/**
 * Giấy tờ của một hồ sơ — ĐỌC QUA RLS bằng client của người đang đăng nhập.
 * Truyền id hồ sơ của người khác vào đây thì chỉ nhận về mảng rỗng.
 */
export async function docGiayTo(
  dbNguoiDung: SupabaseClient,
  profileId: string,
): Promise<GiayToDaNop[]> {
  const { data, error } = await dbNguoiDung
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
