import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatLuongLead, LeadTrichXuat } from "@/lib/lead-extraction";

// Mọi hàm ở đây nhận `db` là client của NHÂN SỰ đang đăng nhập: RLS cho cả
// admin lẫn nhân viên đọc lead, nhưng chỉ admin được ghi.

export interface LeadDaLuu extends LeadTrichXuat {
  conversationId: string;
  /** Số tin nhắn tại thời điểm trích xuất, dùng để biết lead đã cũ chưa. */
  soTinNhanLucTrich: number;
  trichXuatLuc: string;
}

/** Đọc lead của một hội thoại. null nghĩa là chưa trích xuất lần nào. */
export async function docLead(db: SupabaseClient, conversationId: string): Promise<LeadDaLuu | null> {
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

function thanhCot(lead: LeadTrichXuat) {
  return {
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
  };
}

/** Ghi đè lead sau khi Gemini trích xuất (khoá chính là conversation_id nên upsert). */
export async function luuLead(
  db: SupabaseClient,
  conversationId: string,
  lead: LeadTrichXuat,
  soTinNhan: number,
): Promise<boolean> {
  const { data, error } = await db
    .from("leads")
    .upsert(
      {
        conversation_id: conversationId,
        ...thanhCot(lead),
        so_tin_nhan_luc_trich: soTinNhan,
        trich_xuat_luc: new Date().toISOString(),
      },
      { onConflict: "conversation_id" },
    )
    .select("conversation_id");

  if (error) {
    console.error("[leads] Không lưu được lead:", error.code, error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/**
 * Admin sửa tay thông tin lead. Chỉ UPDATE (không tạo mới): phải trích xuất ít
 * nhất một lần rồi mới có lead để sửa. 0 dòng bị sửa = không có quyền.
 */
export async function suaLead(
  db: SupabaseClient,
  conversationId: string,
  lead: LeadTrichXuat,
): Promise<boolean> {
  const { data, error } = await db
    .from("leads")
    .update(thanhCot(lead))
    .eq("conversation_id", conversationId)
    .select("conversation_id");

  if (error) {
    console.error("[leads] Không sửa được lead:", error.code, error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** Chất lượng lead của nhiều hội thoại, để hiển thị ở trang danh sách. */
export async function docChatLuongTheoHoiThoai(
  db: SupabaseClient,
  ids: string[],
): Promise<Map<string, ChatLuongLead>> {
  const ket = new Map<string, ChatLuongLead>();
  if (ids.length === 0) return ket;

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
