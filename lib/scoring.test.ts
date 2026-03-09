import {
  calculateEpisodeScore,
  calculateLeaderboard,
  validatePickBudget,
} from "./scoring";
import type { Pick } from "./types";

// Helper to make partial Pick objects for testing
function makePick(overrides: Partial<Pick> & {
  user_id: string;
  episode_id: string;
  survivor_id: string;
  points: number;
}): Pick {
  return {
    id: "test-id",
    pool_id: "pool-1",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("calculateEpisodeScore", () => {
  it("awards points for picks on eliminated survivors", () => {
    const picks: Pick[] = [
      makePick({ user_id: "user-1", episode_id: "ep-1", survivor_id: "surv-a", points: 10 }),
      makePick({ user_id: "user-1", episode_id: "ep-1", survivor_id: "surv-b", points: 5 }),
    ];

    const results = calculateEpisodeScore(picks, ["surv-a"]);

    expect(results).toHaveLength(1);
    expect(results[0].user_id).toBe("user-1");
    expect(results[0].points_earned).toBe(10); // Only surv-a was eliminated
    expect(results[0].picks_that_scored).toHaveLength(1);
  });

  it("awards 0 points when no picks on eliminated survivors", () => {
    const picks: Pick[] = [
      makePick({ user_id: "user-1", episode_id: "ep-1", survivor_id: "surv-a", points: 10 }),
    ];

    const results = calculateEpisodeScore(picks, ["surv-b"]);
    expect(results[0].points_earned).toBe(0);
  });

  it("handles multiple users correctly", () => {
    const picks: Pick[] = [
      makePick({ user_id: "user-1", episode_id: "ep-1", survivor_id: "surv-a", points: 15 }),
      makePick({ user_id: "user-2", episode_id: "ep-1", survivor_id: "surv-a", points: 8 }),
      makePick({ user_id: "user-2", episode_id: "ep-1", survivor_id: "surv-b", points: 5 }),
    ];

    const results = calculateEpisodeScore(picks, ["surv-a"]);
    const user1 = results.find((r) => r.user_id === "user-1");
    const user2 = results.find((r) => r.user_id === "user-2");

    expect(user1?.points_earned).toBe(15);
    expect(user2?.points_earned).toBe(8);
  });

  it("returns empty array for empty picks", () => {
    expect(calculateEpisodeScore([], ["surv-a"])).toEqual([]);
  });
});

describe("calculateLeaderboard", () => {
  it("sums scores across episodes and sorts descending", () => {
    const scores = [
      { user_id: "user-1", episode_id: "ep-1", points_earned: 10, picks_that_scored: [] },
      { user_id: "user-2", episode_id: "ep-1", points_earned: 20, picks_that_scored: [] },
      { user_id: "user-1", episode_id: "ep-2", points_earned: 15, picks_that_scored: [] },
    ];

    const leaderboard = calculateLeaderboard(scores);

    expect(leaderboard[0]).toEqual({ user_id: "user-1", total_points: 25 });
    expect(leaderboard[1]).toEqual({ user_id: "user-2", total_points: 20 });
  });

  it("returns empty array for empty input", () => {
    expect(calculateLeaderboard([])).toEqual([]);
  });
});

describe("validatePickBudget", () => {
  it("returns valid for picks within budget", () => {
    const result = validatePickBudget([{ points: 10 }, { points: 7 }]);
    expect(result.valid).toBe(true);
    expect(result.total).toBe(17);
    expect(result.remaining).toBe(3);
  });

  it("returns valid for picks exactly at budget", () => {
    const result = validatePickBudget([{ points: 20 }]);
    expect(result.valid).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("returns invalid for picks exceeding budget", () => {
    const result = validatePickBudget([{ points: 15 }, { points: 10 }]);
    expect(result.valid).toBe(false);
    expect(result.total).toBe(25);
    expect(result.remaining).toBe(-5);
  });

  it("handles empty picks array", () => {
    const result = validatePickBudget([]);
    expect(result.valid).toBe(true);
    expect(result.total).toBe(0);
    expect(result.remaining).toBe(20);
  });
});
