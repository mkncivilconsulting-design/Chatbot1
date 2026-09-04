"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { kiemTraBasicAuth } from "@/lib/admin-auth";
import { doiTrangThai } from "@/lib/quote-requests";
import { guiWebhookDuyet } from "@/lib/webhook";
import type { RequestStatus } from "@/lib/mock-data";

const TRANG_THAI_HOP_LE: RequestStatus[] = ["cho_duyet", "da_duyet", "tu_choi"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface KetQuaDuyet {
  /** Trạng thái đã đổi trong database hay chưa. */
  ok: boolean;
  loi?: string;
  /**
   * Chỉ có ý nghĩa khi duyệt: webhook gửi link đăng nhập có nhận được không.
   * Tách riêng khỏi `ok` vì đổi trạng thái thành công mà webhook hỏng là chuyện
   * có thật — admin cần biết để còn liên hệ khách bằng cách khác.
   */
  daGuiLinkDangNhap?: boolean;
}

/**
 * Đổi trạng thái một yêu cầu báo giá.
 *
 * proxy.ts đã chặn /admin/*, nhưng action vẫn tự kiểm tra quyền: nếu sau này
 * matcher trong proxy đổi, đây không được âm thầm thành cửa sửa dữ liệu khách.
 */
export async function duyetYeuCau(id: string, trangThai: RequestStatus): Promise<KetQuaDuyet> {
  const h = await headers();
  if (!kiemTraBasicAuth(h.get("authorization"))) {
    console.error("[admin/requests] Chặn lời gọi đổi trạng thái không có quyền");
    return { ok: false, loi: "Không có quyền thực hiện thao tác này." };
  }

  if (!UUID_RE.test(id)) return { ok: false, loi: "Mã yêu cầu không hợp lệ." };
  if (!TRANG_THAI_HOP_LE.includes(trangThai)) {
    return { ok: false, loi: "Trạng thái không hợp lệ." };
  }

  const khach = await doiTrangThai(id, trangThai);
  if (!khach) return { ok: false, loi: "Không cập nhật được, bạn thử lại nhé." };

  revalidatePath("/admin/requests");

  // Chỉ gửi link đăng nhập khi DUYỆT. Từ chối thì không gửi gì cho khách.
  if (trangThai !== "da_duyet") return { ok: true };

  const daGui = await guiWebhookDuyet(khach);
  return { ok: true, daGuiLinkDangNhap: daGui };
}
