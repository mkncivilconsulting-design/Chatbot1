import { systemInstruction } from "@/lib/qna";

// Model và key đọc từ biến môi trường (file .env). GEMINI_API_KEY chỉ tồn tại
// phía server — không đặt tiền tố NEXT_PUBLIC_, nếu không key sẽ lộ ra trình duyệt.
// Dùng `||` chứ không phải `??`: GEMINI_MODEL= (rỗng) trong .env phải rơi về mặc định.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Số tin nhắn gần nhất gửi kèm để giữ mạch hội thoại, tránh prompt phình vô hạn.
const MAX_HISTORY = 20;

interface IncomingMessage {
  from: "bot" | "user";
  text: string;
}

function isValidMessage(m: unknown): m is IncomingMessage {
  if (typeof m !== "object" || m === null) return false;
  const { from, text } = m as Record<string, unknown>;
  return (from === "bot" || from === "user") && typeof text === "string";
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  const rawMessages = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(rawMessages) || !rawMessages.every(isValidMessage)) {
    return Response.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  const messages = rawMessages.slice(-MAX_HISTORY);

  // Gemini yêu cầu lượt đầu tiên phải là "user", nên bỏ lời chào mở đầu của bot.
  const firstUser = messages.findIndex((m) => m.from === "user");
  if (firstUser === -1) {
    return Response.json({ error: "Chưa có câu hỏi nào." }, { status: 400 });
  }

  const contents = messages.slice(firstUser).map((m) => ({
    role: m.from === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
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
    // Log chi tiết ở server, trả về thông báo chung cho khách để không lộ cấu hình.
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

  return Response.json({ reply });
}
