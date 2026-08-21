import { cookies } from "next/headers";
import { systemInstruction } from "@/lib/qna";
import {
  appendMessages,
  conversationExists,
  createConversation,
  isValidConversationId,
  loadMessages,
  type StoredMessage,
} from "@/lib/conversations";
import { isSupabaseConfigured } from "@/lib/supabase-server";

// Dùng `||` chứ không phải `??`: GEMINI_MODEL= (rỗng) trong .env phải rơi về mặc định.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Số tin nhắn gần nhất gửi kèm cho model. Lịch sử đầy đủ vẫn nằm trong database,
// đây chỉ là trần cho prompt để không phình vô hạn với hội thoại rất dài.
const MAX_HISTORY = 60;

const MAX_MESSAGE_LENGTH = 2000;

// Cookie chỉ chứa id hội thoại (UUID) — không chứa nội dung, không chứa khoá.
// httpOnly: JavaScript trong trình duyệt KHÔNG đọc được giá trị này.
const COOKIE_NAME = "duhoc24_cid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày

async function readConversationId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  return isValidConversationId(raw) ? raw : null;
}

async function writeConversationCookie(id: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

/** Lấy lịch sử hội thoại hiện tại để khung chat dựng lại khi tải trang. */
export async function GET() {
  const id = await readConversationId();
  if (!id) return Response.json({ messages: [] });

  const messages = await loadMessages(id);
  return Response.json({ messages });
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[api/chat] Thiếu GEMINI_API_KEY trong .env");
    return Response.json(
      { error: "Chatbot chưa được cấu hình. Vui lòng liên hệ quản trị viên." },
      { status: 500 },
    );
  }

  if (!isSupabaseConfigured()) {
    console.error("[api/chat] Thiếu SUPABASE_URL hoặc SUPABASE_SECRET_KEY trong .env");
    return Response.json(
      { error: "Chatbot chưa được cấu hình. Vui lòng liên hệ quản trị viên." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  const raw = (body as { message?: unknown })?.message;
  const question = typeof raw === "string" ? raw.trim() : "";
  if (!question) {
    return Response.json({ error: "Chưa có câu hỏi nào." }, { status: 400 });
  }
  if (question.length > MAX_MESSAGE_LENGTH) {
    return Response.json({ error: "Câu hỏi quá dài, bạn rút gọn giúp mình nhé." }, { status: 400 });
  }

  // Cookie có thể trỏ tới hội thoại đã bị xoá — khi đó tạo hội thoại mới.
  let conversationId = await readConversationId();
  if (conversationId && !(await conversationExists(conversationId))) {
    conversationId = null;
  }
  if (!conversationId) {
    conversationId = await createConversation();
    if (!conversationId) {
      return Response.json(
        { error: "Không lưu được hội thoại. Bạn thử lại giúp mình nhé." },
        { status: 502 },
      );
    }
    await writeConversationCookie(conversationId);
  }

  // Lịch sử lấy từ DATABASE, không lấy từ dữ liệu client gửi lên.
  // Nhờ vậy khách không thể bịa lượt trả lời của bot để dụ model nhắc lại.
  const history = await loadMessages(conversationId);

  const contents = [...history, { from: "user" as const, text: question }]
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m.from === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

  // Gemini yêu cầu lượt đầu tiên phải là "user".
  while (contents.length > 0 && contents[0].role !== "user") contents.shift();

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
      },
    );
  } catch (err) {
    console.error("[api/chat] Không gọi được Gemini:", err);
    return Response.json(
      { error: "Không kết nối được tới trợ lý. Bạn thử lại giúp mình nhé." },
      { status: 502 },
    );
  }

  const data = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    console.error("[api/chat] Gemini trả lỗi:", upstream.status, data?.error?.message);
    return Response.json(
      { error: "Trợ lý đang bận. Bạn thử lại sau ít phút nhé." },
      { status: 502 },
    );
  }

  const reply = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();

  if (!reply) {
    console.error("[api/chat] Gemini trả về rỗng:", JSON.stringify(data)?.slice(0, 500));
    return Response.json(
      { error: "Trợ lý chưa trả lời được câu này. Bạn thử hỏi lại giúp mình nhé." },
      { status: 502 },
    );
  }

  // Chỉ lưu khi đã có câu trả lời, để database không đọng câu hỏi mồ côi.
  const toStore: StoredMessage[] = [
    { from: "user", text: question },
    { from: "bot", text: reply },
  ];
  const saved = await appendMessages(conversationId, toStore);
  if (!saved) {
    console.error("[api/chat] Trả lời được nhưng KHÔNG lưu được vào database");
  }

  return Response.json({ reply });
}
