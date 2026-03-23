import { formatDisplayName } from "@/lib/profile-utils";

export type ScoreRow = {
  user_id: string;
  display_name: string;
  team_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  total_points: number;
};

export type MemberRow = {
  user_id: string;
  display_name: string | null;
  team_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalPoints: number;
  isCurrentUser: boolean;
};

export function buildLeaderboard(
  scores: ScoreRow[],
  members: MemberRow[],
  currentUserId: string
): LeaderboardEntry[] {
  const scoreMap = new Map<string, number>(scores.map((s) => [s.user_id, s.total_points]));

  // Build a lookup for profile data from scores (may have richer data from RPC)
  const scoreProfileMap = new Map(
    scores.map((s) => [
      s.user_id,
      { teamName: s.team_name, fullName: s.full_name, avatarUrl: s.avatar_url },
    ])
  );

  const entries = members.map((m) => {
    const scoreProfile = scoreProfileMap.get(m.user_id);
    const teamName = m.team_name ?? scoreProfile?.teamName ?? null;
    const fullName = m.full_name ?? scoreProfile?.fullName ?? null;

    return {
      userId: m.user_id,
      displayName: formatDisplayName(teamName, fullName) || m.display_name || "Unknown",
      avatarUrl: m.avatar_url ?? scoreProfile?.avatarUrl ?? null,
      totalPoints: scoreMap.get(m.user_id) ?? 0,
      isCurrentUser: m.user_id === currentUserId,
      rank: 0,
    };
  });

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
