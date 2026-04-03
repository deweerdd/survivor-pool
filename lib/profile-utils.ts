/** Extract initials from a full name (e.g. "John Doe" → "JD"). */
export function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return "??";
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * Format the display name shown on leaderboards and NavBar.
 * Format: "TeamName (AB)" where AB = initials from full_name.
 * Fallback chain: team_name (initials) → full_name → "Unknown"
 */
export function formatDisplayName(
  teamName: string | null | undefined,
  fullName: string | null | undefined
): string {
  if (teamName) {
    const initials = getInitials(fullName);
    return initials !== "??" ? `${teamName} (${initials})` : teamName;
  }
  return fullName ?? "Unknown";
}
