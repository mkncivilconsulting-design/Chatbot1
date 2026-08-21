"use client";

import React from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chatGreeting, quickQuestions } from "@/lib/qna";

interface Message {
  from: "bot" | "user";
  text: string;
}

export function ChatWidget() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [restoring, setRestoring] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Lịch sử nằm trong database, không nằm trong trình duyệt. Khung chat hỏi server
  // qua GET /api/chat; server nhận diện hội thoại bằng cookie httpOnly mà chính nó
  // đã đặt, nên JavaScript ở đây không hề biết id hội thoại là gì.
  React.useEffect(() => {
    let huy = false;
    (async () => {
      try {
        const res = await fetch("/api/chat");
        const data = await res.json().catch(() => null);
        if (!huy && res.ok && Array.isArray(data?.messages)) {
          setMessages(data.messages);
        }
      } catch {
        // Không tải được lịch sử thì vẫn cho chat tiếp từ đầu.
      } finally {
        if (!huy) setRestoring(false);
      }
    })();
    return () => {
      huy = true;
    };
  }, []);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, open]);

  async function sendMessage(text: string) {
    const question = text.trim();
    if (!question || pending) return;

    setMessages((prev) => [...prev, { from: "user", text: question }]);
    setInput("");
    setPending(true);

    try {
      // Chỉ gửi câu hỏi mới. Lịch sử do server tự đọc từ database.
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      const data = await res.json().catch(() => null);
      const reply =
        (res.ok && data?.reply) ||
        data?.error ||
        "Có lỗi xảy ra, bạn thử lại giúp mình nhé.";
      setMessages((prev) => [...prev, { from: "bot", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "Mất kết nối mạng, bạn kiểm tra lại rồi thử nhé." },
      ]);
    } finally {
      setPending(false);
    }
  }

  // Lời chào chỉ để hiển thị, cố ý KHÔNG lưu vào database — nó không phải nội dung
  // khách nói, và lưu vào chỉ làm bẩn lịch sử hội thoại.
  const bubbles: Message[] = [{ from: "bot", text: chatGreeting }, ...messages];

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border bg-card shadow-xl shadow-black/10 ring-1 ring-foreground/6.5 sm:w-96">
          <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
            <div>
              <p className="text-sm font-medium">Hỏi đáp nhanh</p>
              <p className="text-xs opacity-80">Thường trả lời trong vài phút</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Đóng khung chat"
              className="flex size-7 items-center justify-center rounded-full hover:bg-white/10"
            >
              <X className="size-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {restoring && (
              <p className="text-center text-xs text-muted-foreground">Đang tải hội thoại…</p>
            )}

            {bubbles.map((m, i) => (
              <div
                key={i}
                className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                    m.from === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {pending && (
              <div className="flex justify-start">
                <div
                  className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-3"
                  role="status"
                  aria-label="Trợ lý đang trả lời"
                >
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-3">
            <div className="flex flex-wrap gap-1.5 pb-2">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={pending}
                  className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground duration-150 hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập câu hỏi của bạn..."
                maxLength={2000}
                className="h-9 flex-1 rounded-full border border-input bg-transparent px-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button
                type="submit"
                size="icon"
                className="shrink-0"
                aria-label="Gửi"
                disabled={pending || !input.trim()}
              >
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Đóng khung chat" : "Mở khung chat hỏi đáp"}
        className="ml-auto flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/20 duration-150 hover:brightness-105 active:scale-95"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>
    </div>
  );
}
