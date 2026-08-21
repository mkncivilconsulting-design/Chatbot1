import "server-only";

import type { StoredMessage } from "@/lib/conversations";

// Dùng `||` chứ không phải `??`: GEMINI_MODEL= (rỗng) trong .env phải rơi về mặc định.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

export type ChatLuongLead = "good" | "ok" | "spam";

export interface LeadTrichXuat {
  ten: string | null;
  email: string | null;
  soDienThoai: string | null;
  nuocDuHoc: string | null;
  bacHoc: string | null;
  nganhHoc: string | null;
  thoiGianRanh: string | null;
  daDatLich: boolean;
  ghiChu: string | null;
  chatLuong: ChatLuongLead;
}

// responseSchema ép Gemini trả về đúng JSON theo cấu trúc này, không phải văn xuôi.
const SCHEMA = {
  type: "OBJECT",
  properties: {
    ten: { type: "STRING", nullable: true },
    email: { type: "STRING", nullable: true },
    soDienThoai: { type: "STRING", nullable: true },
    nuocDuHoc: { type: "STRING", nullable: true },
    bacHoc: { type: "STRING", nullable: true },
    nganhHoc: { type: "STRING", nullable: true },
    thoiGianRanh: { type: "STRING", nullable: true },
    daDatLich: { type: "BOOLEAN" },
    ghiChu: { type: "STRING", nullable: true },
    chatLuong: { type: "STRING", enum: ["good", "ok", "spam"] },
  },
  required: ["daDatLich", "chatLuong"],
};

const HUONG_DAN = `Bạn là bộ trích xuất thông tin lead cho một trung tâm tư vấn du học.
Đầu vào là bản ghi hội thoại giữa KHÁCH và CHATBOT. Nhiệm vụ của bạn là rút ra thông tin lead.

QUY TẮC:
- CHỈ lấy thông tin khách thực sự nói ra. TUYỆT ĐỐI không suy đoán, không bịa.
- Trường nào hội thoại không có thì để null. Thà thiếu còn hơn sai.
- Chỉ lấy thông tin do KHÁCH cung cấp. Những gì CHATBOT nói (tên trường, điểm chuẩn, dịch vụ) KHÔNG phải thông tin của khách.
- daDatLich = true chỉ khi khách đồng ý đặt lịch tư vấn, hoặc đưa ra thời gian cụ thể để hẹn. Chatbot mời mà khách chưa trả lời thì vẫn là false.
- thoiGianRanh: ghi nguyên văn thời gian khách nói rảnh (ví dụ "chiều thứ 5 tuần sau"). Không có thì null.
- ghiChu: tóm tắt ngắn những điểm đáng lưu ý cho tư vấn viên mà các trường khác chưa nêu (ví dụ khách chưa thi IELTS, gia đình chưa đồng ý, ngân sách hạn chế). Không có gì đáng ghi thì null.

CHẤT LƯỢNG LEAD (chatLuong):
- "good": khách có nhu cầu du học rõ ràng VÀ đã để lại ít nhất một cách liên hệ (email hoặc số điện thoại).
- "ok": khách có quan tâm thật nhưng chưa để lại thông tin liên hệ, hoặc nhu cầu còn mơ hồ.
- "spam": nội dung rác, thử nghiệm, chọc phá, không liên quan tới du học, hoặc thông tin liên hệ rõ ràng là giả.`;

function chuoiHoacNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

/** Chuyển hội thoại thành bản ghi văn bản cho model đọc. */
function dungBanGhi(messages: StoredMessage[]) {
  return messages
    .map((m) => `${m.from === "user" ? "KHÁCH" : "CHATBOT"}: ${m.text}`)
    .join("\n");
}

/**
 * Gọi Gemini để trích xuất lead. Trả về null nếu không gọi được hoặc kết quả
 * không hợp lệ — phía gọi tự quyết định báo lỗi thế nào.
 */
export async function trichXuatLead(messages: StoredMessage[]): Promise<LeadTrichXuat | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[lead-extraction] Thiếu GEMINI_API_KEY trong .env");
    return null;
  }
  if (messages.length === 0) return null;

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: HUONG_DAN }] },
          contents: [{ role: "user", parts: [{ text: dungBanGhi(messages) }] }],
          generationConfig: {
            temperature: 0, // trích xuất thì cần ổn định, không cần sáng tạo
            responseMimeType: "application/json",
            responseSchema: SCHEMA,
          },
        }),
      },
    );
  } catch (err) {
    console.error("[lead-extraction] Không gọi được Gemini:", err);
    return null;
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    console.error("[lead-extraction] Gemini trả lỗi:", res.status, data?.error?.message);
    return null;
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) {
    console.error("[lead-extraction] Gemini trả về rỗng");
    return null;
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text);
  } catch {
    console.error("[lead-extraction] Không parse được JSON:", text.slice(0, 300));
    return null;
  }

  // Kiểm tra lại dù đã có responseSchema — không tin tuyệt đối vào đầu ra của model.
  const chatLuong =
    raw.chatLuong === "good" || raw.chatLuong === "ok" || raw.chatLuong === "spam"
      ? raw.chatLuong
      : "ok";

  return {
    ten: chuoiHoacNull(raw.ten),
    email: chuoiHoacNull(raw.email),
    soDienThoai: chuoiHoacNull(raw.soDienThoai),
    nuocDuHoc: chuoiHoacNull(raw.nuocDuHoc),
    bacHoc: chuoiHoacNull(raw.bacHoc),
    nganhHoc: chuoiHoacNull(raw.nganhHoc),
    thoiGianRanh: chuoiHoacNull(raw.thoiGianRanh),
    daDatLich: raw.daDatLich === true,
    ghiChu: chuoiHoacNull(raw.ghiChu),
    chatLuong,
  };
}
