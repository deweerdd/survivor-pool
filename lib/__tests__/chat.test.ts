import { describe, it, expect } from "vitest";
import {
  validateMessageBody,
  mergeTimeline,
  type ChatMessageRow,
  type PoolEventRow,
} from "@/lib/chat";

describe("validateMessageBody", () => {
  it("accepts a normal message", () => {
    const result = validateMessageBody("hello world");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.body).toBe("hello world");
  });

  it("trims leading and trailing whitespace", () => {
    const result = validateMessageBody("  hey  ");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.body).toBe("hey");
  });

  it("rejects empty string", () => {
    expect(validateMessageBody("").ok).toBe(false);
  });

  it("rejects whitespace-only", () => {
    expect(validateMessageBody("   \n\t  ").ok).toBe(false);
  });

  it("accepts a 1-char message", () => {
    expect(validateMessageBody("a").ok).toBe(true);
  });

  it("accepts exactly 2000 chars", () => {
    expect(validateMessageBody("a".repeat(2000)).ok).toBe(true);
  });

  it("rejects 2001 chars", () => {
    const result = validateMessageBody("a".repeat(2001));
    expect(result.ok).toBe(false);
  });
});

function msg(id: number, created_at: string, body = "m"): ChatMessageRow {
  return {
    id,
    pool_id: 1,
    user_id: "u1",
    body,
    created_at,
    edited_at: null,
  };
}

function evt(id: number, created_at: string): PoolEventRow {
  return {
    id,
    pool_id: 1,
    type: "member_joined",
    actor_user_id: "u2",
    payload: {},
    created_at,
  };
}

describe("mergeTimeline", () => {
  it("returns empty array when both inputs empty", () => {
    expect(mergeTimeline([], [])).toEqual([]);
  });

  it("handles messages only", () => {
    const m1 = msg(1, "2026-01-01T00:00:00Z");
    const m2 = msg(2, "2026-01-02T00:00:00Z");
    const result = mergeTimeline([m2, m1], []);
    expect(result.map((i) => (i.kind === "message" ? i.message.id : -1))).toEqual([1, 2]);
  });

  it("handles events only", () => {
    const e1 = evt(1, "2026-01-01T00:00:00Z");
    const result = mergeTimeline([], [e1]);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("event");
  });

  it("interleaves messages and events by created_at ascending", () => {
    const m1 = msg(1, "2026-01-01T00:00:00Z");
    const e1 = evt(10, "2026-01-01T01:00:00Z");
    const m2 = msg(2, "2026-01-01T02:00:00Z");
    const e2 = evt(11, "2026-01-01T03:00:00Z");
    const result = mergeTimeline([m2, m1], [e2, e1]);
    const kinds = result.map((i) => i.kind);
    expect(kinds).toEqual(["message", "event", "message", "event"]);
  });

  it("is stable on ties — message before event when timestamps match", () => {
    const m = msg(1, "2026-01-01T00:00:00Z");
    const e = evt(1, "2026-01-01T00:00:00Z");
    const result = mergeTimeline([m], [e]);
    expect(result[0].kind).toBe("message");
    expect(result[1].kind).toBe("event");
  });
});
