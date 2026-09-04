import "server-only";

// URL webhook đọc từ .env, KHÔNG gõ cứng vào code: ai có URL này đều gửi được
// dữ liệu vào kịch bản Make của trung tâm, mà code thì đẩy lên GitHub công khai.
const URL_WEBHOOK = process.env.MAKE_WEBHOOK_URL;

// Chờ tối đa bấy nhiêu rồi bỏ. Khách đang đứng chờ màn hình báo giá, không nên
// bắt họ đợi Make.com phản hồi lâu.
const HAN_CHO_MS = 5000;

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
