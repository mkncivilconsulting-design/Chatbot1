import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { ChatLuongLead, LeadTrichXuat } from "@/lib/lead-extraction";

export interface LeadDaLuu extends LeadTrichXuat {
  conversationId: string;
  /** Số tin nhắn tại thời điểm trích xuất, dùng để biết lead đã cũ chưa. */
  soTinNhanLucTrich: number;
  trichXuatLuc: string;
}

/** Đọc lead của một hội thoại. null nghĩa là chưa trích xuất lần nào. */
export async function docLead(conversationId: string): Promise<LeadDaLuu | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("leads")
    .select("*")
    .eq("conversation_id", conversationId)
    .maybeSingle();

  if (error) {
    console.error("[leads] Không đọc được lead:", error.message);
    return null;
  }
  if (!data) return null;

  return {
    conversationId: data.conversation_id as string,
    ten: data.ten as string | null,
    email: data.email as string | null,
    soDienThoai: data.so_dien_thoai as string | null,
    nuocDuHoc: data.nuoc_du_hoc as string | null,
    bacHoc: data.bac_hoc as string | null,
    nganhHoc: data.nganh_hoc as string | null,
    thoiGianRanh: data.thoi_gian_ranh as string | null,
    daDatLich: Boolean(data.da_dat_lich),
    ghiChu: data.ghi_chu as string | null,
    chatLuong: data.chat_luong as ChatLuongLead,
    soTinNhanLucTrich: (data.so_tin_nhan_luc_trich as number) ?? 0,
    trichXuatLuc: data.trich_xuat_luc as string,
  };
}

/** Ghi đè lead của một hội thoại (khoá chính là conversation_id nên upsert). */
export async function luuLead(
  conversationId: string,
  lead: LeadTrichXuat,
  soTinNhan: number,
): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;

  const { error } = await db.from("leads").upsert(
    {
      conversation_id: conversationId,
      ten: lead.ten,
      email: lead.email,
      so_dien_thoai: lead.soDienThoai,
      nuoc_du_hoc: lead.nuocDuHoc,
      bac_hoc: lead.bacHoc,
      nganh_hoc: lead.nganhHoc,
      thoi_gian_ranh: lead.thoiGianRanh,
      da_dat_lich: lead.daDatLich,
      ghi_chu: lead.ghiChu,
      chat_luong: lead.chatLuong,
      so_tin_nhan_luc_trich: soTinNhan,
      trich_xuat_luc: new Date().toISOString(),
    },
    { onConflict: "conversation_id" },
  );

  if (error) {
    console.error("[leads] Không lưu được lead:", error.message);
    return false;
  }
  return true;
}

/** Chất lượng lead của nhiều hội thoại, để hiển thị ở trang danh sách. */
export async function docChatLuongTheoHoiThoai(
  ids: string[],
): Promise<Map<string, ChatLuongLead>> {
  const ket = new Map<string, ChatLuongLead>();
  const db = getSupabaseAdmin();
  if (!db || ids.length === 0) return ket;

  const { data, error } = await db
    .from("leads")
    .select("conversation_id, chat_luong")
    .in("conversation_id", ids);

  if (error) {
    console.error("[leads] Không đọc được chất lượng lead:", error.message);
    return ket;
  }
  for (const row of data ?? []) {
    ket.set(row.conversation_id as string, row.chat_luong as ChatLuongLead);
  }
  return ket;
}
