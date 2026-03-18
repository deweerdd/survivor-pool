import { describe, it, expect } from "vitest";
import { buildLeaderboard, type MemberRow, type ScoreRow } from "@/lib/leaderboard";

const makeMember = (userId: string, displayName?: string): MemberRow => ({
  user_id: userId,
  display_name: displayName ?? `User ${userId}`,
});

const makeScore = (userId: string, points: number): ScoreRow => ({
  user_id: userId,
  display_name: `User ${userId}`,
  total_points: points,
});

describe("buildLeaderboard", () => {
  it("empty state — no scores, two members → both at 0 pts, both rank 1, current user flagged", () => {
    const members = [makeMember("u1"), makeMember("u2")];
    const result = buildLeaderboard([], members, "u1");
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.totalPoints === 0)).toBe(true);
    expect(result.every((e) => e.rank === 1)).toBe(true);
    expect(result.find((e) => e.userId === "u1")?.isCurrentUser).toBe(true);
    expect(result.find((e) => e.userId === "u2")?.isCurrentUser).toBe(false);
  });

  it("basic sort — u1: 40, u2: 20 → rank 1 and 2 in order", () => {
    const members = [makeMember("u1"), makeMember("u2")];
    const scores = [makeScore("u1", 40), makeScore("u2", 20)];
    const result = buildLeaderboard(scores, members, "other");
    expect(result[0].userId).toBe("u1");
    expect(result[0].rank).toBe(1);
    expect(result[1].userId).toBe("u2");
    expect(result[1].rank).toBe(2);
  });

  it("tied ranks — u1: 30, u2: 30, u3: 10 → ranks 1, 1, 3", () => {
    const members = [makeMember("u1"), makeMember("u2"), makeMember("u3")];
    const scores = [makeScore("u1", 30), makeScore("u2", 30), makeScore("u3", 10)];
    const result = buildLeaderboard(scores, members, "other");
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(1);
    expect(result[2].rank).toBe(3);
    expect(result[2].userId).toBe("u3");
  });

  it("tiebreaker — same points, sorted by displayName ascending", () => {
    const members = [makeMember("u1", "Zara"), makeMember("u2", "Alice")];
    const scores = [makeScore("u1", 30), makeScore("u2", 30)];
    const result = buildLeaderboard(scores, members, "other");
    expect(result[0].displayName).toBe("Alice");
    expect(result[1].displayName).toBe("Zara");
  });

  it("isCurrentUser flag — only the matching userId has true", () => {
    const members = [makeMember("u1"), makeMember("u2"), makeMember("u3")];
    const result = buildLeaderboard([], members, "u2");
    expect(result.filter((e) => e.isCurrentUser)).toHaveLength(1);
    expect(result.find((e) => e.userId === "u2")?.isCurrentUser).toBe(true);
  });

  it("ghost member — score row for user not in members is excluded", () => {
    const members = [makeMember("u1"), makeMember("u2")];
    const scores = [makeScore("u1", 10), makeScore("ghost", 100)];
    const result = buildLeaderboard(scores, members, "u1");
    expect(result).toHaveLength(2);
    expect(result.find((e) => e.userId === "ghost")).toBeUndefined();
  });

  it("null display_name falls back to Unknown", () => {
    const members: MemberRow[] = [{ user_id: "u1", display_name: null }];
    const result = buildLeaderboard([], members, "u1");
    expect(result[0].displayName).toBe("Unknown");
  });

  it("single member no scores — returns one entry, rank 1, 0 pts", () => {
    const result = buildLeaderboard([], [makeMember("u1")], "u1");
    expect(result).toHaveLength(1);
    expect(result[0].rank).toBe(1);
    expect(result[0].totalPoints).toBe(0);
  });
});
