"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { ActionResult } from "@/lib/actions/types";
import { createClient } from "@/lib/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import {
  mergeTimeline,
  MAX_MESSAGE_LENGTH,
  type ChatMessageRow,
  type PoolEventRow,
  type TimelineItem,
} from "@/lib/chat";
import { sendChatMessageAction, deleteChatMessageFormAction } from "@/lib/actions/chat";

export type MemberInfo = {
  displayName: string;
  avatarUrl: string | null;
};

type Props = {
  poolId: number;
  currentUserId: string;
  initialMessages: ChatMessageRow[];
  initialEvents: PoolEventRow[];
  members: Record<string, MemberInfo>;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TimeLabel({ iso, className }: { iso: string; className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <span className={className} suppressHydrationWarning>
      {mounted ? formatTime(iso) : ""}
    </span>
  );
}

function describeEvent(event: PoolEventRow, members: Record<string, MemberInfo>): string {
  const actor = event.actor_user_id ? members[event.actor_user_id]?.displayName : null;
  const actorLabel = actor ?? "Someone";
  const payload = (event.payload ?? {}) as Record<string, unknown>;

  switch (event.type) {
    case "member_joined":
      return `${actorLabel} joined the pool`;
    case "pick_changed": {
      const prev = (payload.previous_contestant_name as string | undefined) ?? null;
      const next = (payload.contestant_name as string | undefined) ?? "a contestant";
      if (prev) return `${actorLabel} switched their Sole Survivor from ${prev} to ${next}`;
      return `${actorLabel} picked ${next} as their Sole Survivor`;
    }
    case "achievement_earned": {
      const label = (payload.achievement_label as string | undefined) ?? "an achievement";
      return `${actorLabel} earned ${label}`;
    }
    case "elimination_recap": {
      const ep = payload.episode_number as number | undefined;
      const names = (payload.eliminated_contestant_names as string[] | undefined) ?? [];
      const nameList = names.length > 0 ? names.join(", ") : "a contestant";
      return `Episode ${ep ?? "?"} recap — eliminated: ${nameList}`;
    }
    default:
      return `${actorLabel} did something`;
  }
}

function EventIcon({ type }: { type: PoolEventRow["type"] }) {
  switch (type) {
    case "member_joined":
      return <span aria-hidden="true">👋</span>;
    case "pick_changed":
      return <span aria-hidden="true">⭐</span>;
    case "achievement_earned":
      return <span aria-hidden="true">🏆</span>;
    case "elimination_recap":
      return <span aria-hidden="true">🔥</span>;
    default:
      return null;
  }
}

export default function PoolChat({
  poolId,
  currentUserId,
  initialMessages,
  initialEvents,
  members,
}: Props) {
  const [messages, setMessages] = useState<ChatMessageRow[]>(initialMessages);
  const [events, setEvents] = useState<PoolEventRow[]>(initialEvents);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sendState, setSendState] = useState<ActionResult | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [bodyInput, setBodyInput] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const timeline = useMemo(() => mergeTimeline(messages, events), [messages, events]);
  const supabase = useMemo(() => createClient(), []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel(`pool:${poolId}`);

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `pool_id=eq.${poolId}`,
      },
      (payload) => {
        const row = payload.new as ChatMessageRow;
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "chat_messages",
        filter: `pool_id=eq.${poolId}`,
      },
      (payload) => {
        const oldRow = payload.old as Partial<ChatMessageRow>;
        if (oldRow.id === undefined) return;
        setMessages((prev) => prev.filter((m) => m.id !== oldRow.id));
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "pool_events",
        filter: `pool_id=eq.${poolId}`,
      },
      (payload) => {
        const row = payload.new as PoolEventRow;
        setEvents((prev) => (prev.some((e) => e.id === row.id) ? prev : [...prev, row]));
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [poolId, supabase]);

  // Auto-scroll to bottom when timeline grows
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [timeline.length]);

  const remaining = MAX_MESSAGE_LENGTH - bodyInput.trim().length;
  const canSubmit = bodyInput.trim().length > 0 && remaining >= 0 && !isSending;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    const fd = new FormData(e.currentTarget);
    setIsSending(true);
    const result = await sendChatMessageAction(null, fd);
    setIsSending(false);
    setSendState(result);
    if (result.status === "ok") setBodyInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) formRef.current?.requestSubmit();
    }
  }

  return (
    <div className="card p-0 overflow-hidden flex flex-col animate-fade-up delay-200 h-[32rem]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {timeline.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Say something to get the fire going.
          </div>
        )}
        {timeline.map((item) => {
          if (item.kind === "event") {
            return (
              <div
                key={`e-${item.event.id}`}
                className="flex items-center gap-2 text-xs italic text-muted-foreground bg-surface-raised rounded px-3 py-2"
              >
                <EventIcon type={item.event.type} />
                <span className="flex-1">{describeEvent(item.event, members)}</span>
                <TimeLabel iso={item.event.created_at} className="tabular-nums shrink-0" />
              </div>
            );
          }

          const m = item.message;
          const author = members[m.user_id];
          const isOwn = m.user_id === currentUserId;
          return (
            <div key={`m-${m.id}`} className="flex items-start gap-2 group">
              <UserAvatar
                avatarUrl={author?.avatarUrl ?? null}
                fullName={author?.displayName ?? "Unknown"}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{author?.displayName ?? "Unknown"}</span>
                  <TimeLabel
                    iso={m.created_at}
                    className="text-xs text-muted-foreground tabular-nums"
                  />
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
              </div>
              {isOwn && (
                <form action={deleteChatMessageFormAction}>
                  <input type="hidden" name="messageId" value={m.id} />
                  <input type="hidden" name="poolId" value={poolId} />
                  <button
                    type="submit"
                    className="btn btn-ghost btn-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    aria-label="Delete message"
                  >
                    ✕
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="border-t border-border p-3 flex flex-col gap-2"
      >
        <input type="hidden" name="poolId" value={poolId} />
        <textarea
          name="body"
          value={bodyInput}
          onChange={(e) => setBodyInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message…"
          rows={2}
          className="input resize-none"
          maxLength={MAX_MESSAGE_LENGTH + 200}
          disabled={isSending}
        />
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs tabular-nums text-muted-foreground"
            style={remaining < 0 ? { color: "var(--destructive)" } : undefined}
          >
            {remaining} left
          </span>
          <div className="flex items-center gap-2">
            {sendState?.status === "error" && (
              <span className="text-xs" style={{ color: "var(--destructive)" }}>
                {sendState.error}
              </span>
            )}
            <button type="submit" disabled={!canSubmit} className="btn btn-torch btn-sm">
              {isSending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
