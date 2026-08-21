import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-server";

export interface StoredMessage {
  from: "bot" | "user";
  text: string;
}

export interface ConversationSummary {
  id: string;
  channel: string;
  messageCount: number;
  startedAt: string;
  lastMessageAt: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Chặn sớm giá trị cookie rác trước khi đem đi truy vấn database. */
export function isValidConversationId(id: unknown): id is string {
  return typeof id === "string" && UUID_RE.test(id);
}

export async function createConversation(): Promise<string | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("conversations")
    .insert({ channel: "Web" })
    .select("id")
    .single();

  if (error) {
    console.error("[conversations] Không tạo được hội thoại:", error.message);
    return null;
  }
  return data.id as string;
}

export async function conversationExists(id: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;

  const { data, error } = await db
    .from("conversations")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[conversations] Không kiểm tra được hội thoại:", error.message);
    return false;
  }
  return Boolean(data);
}

/** Toàn bộ tin nhắn của một hội thoại, cũ trước mới sau. */
export async function loadMessages(conversationId: string): Promise<StoredMessage[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db
    .from("messages")
    .select("sender, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("[conversations] Không đọc được tin nhắn:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    from: row.sender as "bot" | "user",
    text: row.content as string,
  }));
}

export async function appendMessages(
  conversationId: string,
  messages: StoredMessage[],
): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db || messages.length === 0) return false;

  const { error } = await db.from("messages").insert(
    messages.map((m) => ({
      conversation_id: conversationId,
      sender: m.from,
      content: m.text,
    })),
  );

  if (error) {
    console.error("[conversations] Không lưu được tin nhắn:", error.message);
    return false;
  }

  // Cập nhật mốc thời gian để trang admin sắp xếp được theo hoạt động gần nhất.
  const { error: touchError } = await db
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (touchError) {
    // Không nghiêm trọng: tin nhắn đã lưu rồi, chỉ mốc thời gian bị lệch.
    console.error("[conversations] Không cập nhật được last_message_at:", touchError.message);
  }
  return true;
}

/** Danh sách hội thoại kèm số tin nhắn, dùng cho trang /admin/conversations. */
export async function listConversations(limit = 50): Promise<ConversationSummary[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db
    .from("conversations")
    .select("id, channel, created_at, last_message_at, messages(count)")
    .order("last_message_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[conversations] Không đọc được danh sách hội thoại:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const rel = row.messages as unknown as { count: number }[] | null;
    return {
      id: row.id as string,
      channel: (row.channel as string) ?? "Web",
      messageCount: rel?.[0]?.count ?? 0,
      startedAt: row.created_at as string,
      lastMessageAt: row.last_message_at as string,
    };
  });
}
