import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { RequestStatus, ServicePackage } from "@/lib/mock-data";

export type BacHoc = "thpt" | "dai_hoc" | "thac_si";

export const TEN_BAC_HOC: Record<BacHoc, string> = {
  thpt: "THPT",
  dai_hoc: "Đại học",
  thac_si: "Thạc sĩ",
};

export interface YeuCauBaoGia {
  id: string;
  tenKhach: string;
  email: string;
  soDienThoai: string | null;
  quocGia: string;
  bacHoc: BacHoc;
  goiDichVu: ServicePackage;
  gia: number;
  trangThai: RequestStatus;
  createdAt: string;
}

export interface DuLieuGui {
  tenKhach: string;
  email: string;
  soDienThoai: string | null;
  quocGia: string;
  bacHoc: BacHoc;
  goiDichVu: ServicePackage;
  gia: number;
}

/** Trả về id của yêu cầu vừa lưu, hoặc null nếu lưu hỏng. */
export async function luuYeuCauBaoGia(du: DuLieuGui): Promise<string | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("quote_requests")
    .insert({
      ten_khach: du.tenKhach,
      email: du.email,
      so_dien_thoai: du.soDienThoai,
      quoc_gia: du.quocGia,
      bac_hoc: du.bacHoc,
      goi_dich_vu: du.goiDichVu,
      gia: du.gia,
      // trang_thai để mặc định 'cho_duyet'
    })
    .select("id")
    .single();

  if (error) {
    console.error("[quote-requests] Không lưu được yêu cầu:", error.message);
    return null;
  }
  return data.id as string;
}

export async function danhSachYeuCau(limit = 100): Promise<YeuCauBaoGia[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db
    .from("quote_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[quote-requests] Không đọc được danh sách:", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id as string,
    tenKhach: r.ten_khach as string,
    email: r.email as string,
    soDienThoai: (r.so_dien_thoai as string | null) ?? null,
    quocGia: r.quoc_gia as string,
    bacHoc: r.bac_hoc as BacHoc,
    goiDichVu: r.goi_dich_vu as ServicePackage,
    gia: Number(r.gia),
    trangThai: r.trang_thai as RequestStatus,
    createdAt: r.created_at as string,
  }));
}

/**
 * Đổi trạng thái và trả về thông tin khách của yêu cầu đó.
 * Trả null nếu không đổi được — phía gọi cần tên/email để gửi webhook,
 * nên lấy luôn trong cùng một lượt thay vì truy vấn thêm.
 */
export async function doiTrangThai(
  id: string,
  trangThai: RequestStatus,
): Promise<{ id: string; tenKhach: string; email: string } | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("quote_requests")
    .update({ trang_thai: trangThai })
    .eq("id", id)
    .select("id, ten_khach, email")
    .maybeSingle();

  if (error) {
    console.error("[quote-requests] Không đổi được trạng thái:", error.message);
    return null;
  }
  if (!data) {
    console.error("[quote-requests] Không tìm thấy yêu cầu:", id);
    return null;
  }

  return {
    id: data.id as string,
    tenKhach: data.ten_khach as string,
    email: data.email as string,
  };
}
