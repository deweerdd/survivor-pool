export type ScoreRow = {
  user_id: string;
  display_name: string;
  total_points: number;
};

export type MemberRow = {
  user_id: string;
  display_name: string | null;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  totalPoints: number;
  isCurrentUser: boolean;
};

export function buildLeaderboard(
  scores: ScoreRow[],
  members: MemberRow[],
  currentUserId: string
): LeaderboardEntry[] {
  const scoreMap = new Map<string, number>(scores.map((s) => [s.user_id, s.total_points]));

  const entries = members.map((m) => ({
    userId: m.user_id,
    displayName: m.display_name ?? "Unknown",
    totalPoints: scoreMap.get(m.user_id) ?? 0,
    isCurrentUser: m.user_id === currentUserId,
    rank: 0,
  }));

  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return a.displayName.localeCompare(b.displayName);
  });

  let currentRank = 1;
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].totalPoints !== entries[i - 1].totalPoints) {
      currentRank = i + 1;
    }
    entries[i].rank = currentRank;
  }

  return entries;
}
