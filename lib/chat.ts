import type { Database } from "@/lib/supabase/database.types";

export type ChatMessageRow = Database["public"]["Tables"]["chat_messages"]["Row"];
export type PoolEventRow = Database["public"]["Tables"]["pool_events"]["Row"];
export type PoolEventType = Database["public"]["Enums"]["pool_event_type"];

export const MAX_MESSAGE_LENGTH = 2000;

export type ValidateMessageResult = { ok: true; body: string } | { ok: false; error: string };

export function validateMessageBody(raw: string): ValidateMessageResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, error: "Message cannot be empty." };
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters.` };
  }
  return { ok: true, body: trimmed };
}

export type TimelineItem =
  | { kind: "message"; message: ChatMessageRow; sortKey: string }
  | { kind: "event"; event: PoolEventRow; sortKey: string };

export function mergeTimeline(messages: ChatMessageRow[], events: PoolEventRow[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...messages.map((m): TimelineItem => ({ kind: "message", message: m, sortKey: m.created_at })),
    ...events.map((e): TimelineItem => ({ kind: "event", event: e, sortKey: e.created_at })),
  ];

  // Ascending by timestamp; messages before events on ties (stable).
  items.sort((a, b) => {
    if (a.sortKey < b.sortKey) return -1;
    if (a.sortKey > b.sortKey) return 1;
    if (a.kind === "message" && b.kind === "event") return -1;
    if (a.kind === "event" && b.kind === "message") return 1;
    return 0;
  });

  return items;
}
