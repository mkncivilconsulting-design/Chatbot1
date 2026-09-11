"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { kiemTraAdmin } from "@/lib/dal";
import { taoClientAuth } from "@/lib/supabase-auth";
import { getConversationDetail, isValidConversationId, xoaHoiThoai } from "@/lib/conversations";
import { trichXuatLead, type ChatLuongLead, type LeadTrichXuat } from "@/lib/lead-extraction";
import { luuLead, suaLead } from "@/lib/leads";

// Mọi action ở đây là thao tác GHI → CHỈ ADMIN. Hai lớp chặn: kiểm tra vai trò
// ngay đầu hàm, và câu lệnh chạy bằng phiên của người đăng nhập nên RLS trong
// database chặn tiếp nếu không phải admin.

export interface KetQuaThaoTac {
  ok: boolean;
  loi?: string;
}

const CHI_ADMIN = "Chỉ admin mới được thực hiện thao tác này.";

/** Đọc hội thoại, gọi Gemini trích xuất thông tin lead, lưu vào Supabase. */
export async function chayTrichXuatLead(conversationId: string): Promise<KetQuaThaoTac> {
  if (!(await kiemTraAdmin())) return { ok: false, loi: CHI_ADMIN };
  if (!isValidConversationId(conversationId)) {
    return { ok: false, loi: "Mã hội thoại không hợp lệ." };
  }

  const db = await taoClientAuth();
  const hoiThoai = await getConversationDetail(db, conversationId);
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

  if (!(await luuLead(db, conversationId, lead, hoiThoai.messages.length))) {
    return { ok: false, loi: "Trích xuất xong nhưng không lưu được vào database." };
  }

  revalidatePath(`/admin/conversations/${conversationId}`);
  revalidatePath("/admin/conversations");
  return { ok: true };
}

const CHAT_LUONG: ChatLuongLead[] = ["good", "ok", "spam"];

function chuoi(formData: FormData, ten: string, toiDa = 300): string | null {
  const v = String(formData.get(ten) ?? "").trim().slice(0, toiDa);
  return v === "" ? null : v;
}

/** Admin sửa tay thông tin lead (khi Gemini đọc sai hoặc khách bổ sung qua điện thoại). */
export async function suaThongTinLead(
  conversationId: string,
  formData: FormData,
): Promise<KetQuaThaoTac> {
  if (!(await kiemTraAdmin())) return { ok: false, loi: CHI_ADMIN };
  if (!isValidConversationId(conversationId)) {
    return { ok: false, loi: "Mã hội thoại không hợp lệ." };
  }

  const chatLuong = String(formData.get("chatLuong") ?? "") as ChatLuongLead;
  if (!CHAT_LUONG.includes(chatLuong)) return { ok: false, loi: "Chất lượng lead không hợp lệ." };

  const lead: LeadTrichXuat = {
    ten: chuoi(formData, "ten"),
    email: chuoi(formData, "email"),
    soDienThoai: chuoi(formData, "soDienThoai"),
    nuocDuHoc: chuoi(formData, "nuocDuHoc"),
    bacHoc: chuoi(formData, "bacHoc"),
    nganhHoc: chuoi(formData, "nganhHoc"),
    thoiGianRanh: chuoi(formData, "thoiGianRanh"),
    daDatLich: formData.get("daDatLich") === "on",
    ghiChu: chuoi(formData, "ghiChu", 2000),
    chatLuong,
  };

  if (!(await suaLead(await taoClientAuth(), conversationId, lead))) {
    return { ok: false, loi: "Không lưu được thay đổi, bạn thử lại nhé." };
  }
  revalidatePath(`/admin/conversations/${conversationId}`);
  revalidatePath("/admin/conversations");
  return { ok: true };
}

/** Xoá cả hội thoại (tin nhắn và lead đi theo), xong quay về danh sách. */
export async function xoaHoiThoaiAction(conversationId: string): Promise<KetQuaThaoTac> {
  if (!(await kiemTraAdmin())) return { ok: false, loi: CHI_ADMIN };
  if (!isValidConversationId(conversationId)) {
    return { ok: false, loi: "Mã hội thoại không hợp lệ." };
  }

  if (!(await xoaHoiThoai(await taoClientAuth(), conversationId))) {
    return { ok: false, loi: "Không xoá được hội thoại, bạn thử lại nhé." };
  }
  revalidatePath("/admin/conversations");
  redirect("/admin/conversations");
}
