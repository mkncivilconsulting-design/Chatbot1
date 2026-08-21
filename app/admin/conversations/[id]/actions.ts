"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { kiemTraBasicAuth } from "@/lib/admin-auth";
import { getConversationDetail, isValidConversationId } from "@/lib/conversations";
import { trichXuatLead } from "@/lib/lead-extraction";
import { luuLead } from "@/lib/leads";

export interface KetQuaTrichXuat {
  ok: boolean;
  loi?: string;
}

/**
 * Đọc hội thoại, gọi Gemini trích xuất thông tin lead, lưu vào Supabase.
 *
 * Server Action POST về chính URL /admin/... nên đã đi qua proxy.ts. Dù vậy vẫn
 * tự kiểm tra quyền ở đây: nếu sau này matcher trong proxy.ts đổi, action này
 * không được âm thầm trở thành cửa mở vào dữ liệu cá nhân của khách.
 */
export async function chayTrichXuatLead(conversationId: string): Promise<KetQuaTrichXuat> {
  const h = await headers();
  if (!kiemTraBasicAuth(h.get("authorization"))) {
    console.error("[actions] Chặn lời gọi trích xuất lead không có quyền");
    return { ok: false, loi: "Không có quyền thực hiện thao tác này." };
  }

  if (!isValidConversationId(conversationId)) {
    return { ok: false, loi: "Mã hội thoại không hợp lệ." };
  }

  const hoiThoai = await getConversationDetail(conversationId);
  if (!hoiThoai) return { ok: false, loi: "Không tìm thấy hội thoại." };
  if (hoiThoai.messages.length === 0) {
    return { ok: false, loi: "Hội thoại này chưa có tin nhắn nào để trích xuất." };
  }

  const lead = await trichXuatLead(
    hoiThoai.messages.map((m) => ({ from: m.from, text: m.text })),
  );
  if (!lead) {
    return { ok: false, loi: "Không trích xuất được, bạn thử lại sau ít phút nhé." };
  }

  const daLuu = await luuLead(conversationId, lead, hoiThoai.messages.length);
  if (!daLuu) {
    return { ok: false, loi: "Trích xuất xong nhưng không lưu được vào database." };
  }

  revalidatePath(`/admin/conversations/${conversationId}`);
  revalidatePath("/admin/conversations");
  return { ok: true };
}
