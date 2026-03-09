import type { Pick, Survivor } from "@/lib/types";

export interface ScoringResult {
  user_id: string;
  episode_id: string;
  points_earned: number;
  picks_that_scored: Array<{ survivor_id: string; points: number }>;
}

/**
 * Calculate points earned for a set of picks given the survivors eliminated in an episode.
 * Points are earned for every point placed on a survivor who was eliminated that episode.
 */
export function calculateEpisodeScore(
  picks: Pick[],
  eliminatedSurvivorIds: string[]
): ScoringResult[] {
  const eliminatedSet = new Set(eliminatedSurvivorIds);
  const byUser = groupBy(picks, (p) => p.user_id);

  return Object.entries(byUser).map(([user_id, userPicks]) => {
    const scoringPicks = userPicks.filter((p) =>
      eliminatedSet.has(p.survivor_id)
    );
    const points_earned = scoringPicks.reduce((sum, p) => sum + p.points, 0);

    return {
      user_id,
      episode_id: userPicks[0].episode_id,
      points_earned,
      picks_that_scored: scoringPicks.map((p) => ({
        survivor_id: p.survivor_id,
        points: p.points,
      })),
    };
  });
}

/**
 * Calculate running leaderboard totals from all episode scores.
 * Returns sorted array (highest first).
 */
export function calculateLeaderboard(
  allScores: ScoringResult[]
): Array<{ user_id: string; total_points: number }> {
  const totals: Record<string, number> = {};

  for (const score of allScores) {
    totals[score.user_id] = (totals[score.user_id] ?? 0) + score.points_earned;
  }

  return Object.entries(totals)
    .map(([user_id, total_points]) => ({ user_id, total_points }))
    .sort((a, b) => b.total_points - a.total_points);
}

/**
 * Validate that a set of picks doesn't exceed the max point budget.
 */
export function validatePickBudget(
  picks: Array<{ points: number }>,
  maxPoints = 20
): { valid: boolean; total: number; remaining: number } {
  const total = picks.reduce((sum, p) => sum + p.points, 0);
  return {
    valid: total <= maxPoints,
    total,
    remaining: maxPoints - total,
  };
}

// Helper
function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = key(item);
      (acc[k] ??= []).push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}
