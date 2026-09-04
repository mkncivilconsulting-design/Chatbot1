import "server-only";

// URL webhook đọc từ .env, KHÔNG gõ cứng vào code: ai có URL này đều gửi được
// dữ liệu vào kịch bản Make của trung tâm, mà code thì đẩy lên GitHub công khai.
const URL_WEBHOOK = process.env.MAKE_WEBHOOK_URL;
const URL_WEBHOOK_DUYET = process.env.MAKE_APPROVAL_WEBHOOK_URL;

// Chờ tối đa bấy nhiêu rồi bỏ. Khách đang đứng chờ màn hình báo giá, không nên
// bắt họ đợi Make.com phản hồi lâu.
const HAN_CHO_MS = 5000;

/**
 * Link đăng nhập gửi cho khách sau khi yêu cầu được duyệt.
 *
 * Đọc từ LOGIN_URL; không có thì tự ghép từ NEXT_PUBLIC_SITE_URL + "/login".
 * Nhờ vậy khi có trang đăng nhập thật, chỉ cần đổi giá trị biến môi trường —
 * KHÔNG phải sửa code, cũng KHÔNG phải đụng gì tới kịch bản Make, vì tên trường
 * trong payload (`linkDangNhap`) giữ nguyên.
 */
export function layLinkDangNhap(): string {
  const rieng = process.env.LOGIN_URL?.trim();
  if (rieng) return rieng;
  const goc = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${goc}/login`;
}

export interface YeuCauGuiDi {
  id: string;
  tenKhach: string;
  email: string;
  goiDichVu: string;
  gia: number;
}

/**
 * Bắn thông tin yêu cầu báo giá sang webhook của Make.
 *
 * Hàm này KHÔNG bao giờ ném lỗi. Yêu cầu đã lưu vào database trước khi gọi đến
 * đây, nên webhook hỏng thì chỉ là mất phần tự động hoá — tuyệt đối không được
 * làm hỏng màn hình báo giá của khách. Lỗi ghi vào log để còn lần ra.
 *
 * Trả về true nếu webhook nhận thành công.
 */
export async function guiWebhookYeuCau(du: YeuCauGuiDi): Promise<boolean> {
  if (!URL_WEBHOOK) {
    // Không cấu hình webhook là trường hợp hợp lệ (ví dụ chạy ở máy học viên),
    // nên chỉ ghi chú chứ không coi là lỗi.
    console.info("[webhook] Chưa cấu hình MAKE_WEBHOOK_URL, bỏ qua bước gửi.");
    return false;
  }

  try {
    const res = await fetch(URL_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: du.id,
        tenKhach: du.tenKhach,
        email: du.email,
        goiDichVu: du.goiDichVu,
        gia: du.gia,
      }),
      signal: AbortSignal.timeout(HAN_CHO_MS),
    });

    if (!res.ok) {
      console.error(
        "[webhook] Make trả lỗi:",
        res.status,
        (await res.text().catch(() => "")).slice(0, 200),
      );
      return false;
    }
    return true;
  } catch (err) {
    // Bao gồm cả trường hợp quá hạn chờ (AbortError).
    console.error("[webhook] Không gửi được sang Make:", err);
    return false;
  }
}

export interface KhachDaDuyet {
  id: string;
  tenKhach: string;
  email: string;
}

/**
 * Bắn thông tin khách sang webhook khi admin duyệt yêu cầu.
 *
 * Cũng như webhook báo giá: KHÔNG bao giờ ném lỗi. Trạng thái đã đổi trong
 * database trước khi gọi đến đây, nên webhook hỏng chỉ là mất phần tự động hoá.
 * Trả về true nếu webhook nhận thành công (HTTP 2xx).
 */
export async function guiWebhookDuyet(du: KhachDaDuyet): Promise<boolean> {
  if (!URL_WEBHOOK_DUYET) {
    console.info("[webhook] Chưa cấu hình MAKE_APPROVAL_WEBHOOK_URL, bỏ qua bước gửi.");
    return false;
  }

  try {
    const res = await fetch(URL_WEBHOOK_DUYET, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: du.id,
        tenKhach: du.tenKhach,
        email: du.email,
        // Tên trường này là hợp đồng với Make — ĐỪNG đổi. Muốn thay link thật
        // thì đổi biến môi trường LOGIN_URL, kịch bản Make giữ nguyên.
        linkDangNhap: layLinkDangNhap(),
      }),
      signal: AbortSignal.timeout(HAN_CHO_MS),
    });

    if (!res.ok) {
      console.error(
        "[webhook] Make (duyệt) trả lỗi:",
        res.status,
        (await res.text().catch(() => "")).slice(0, 200),
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("[webhook] Không gửi được webhook duyệt:", err);
    return false;
  }
}
