/**
 * Derives the auto-lock timestamp from a date-only air_date.
 * Survivor airs Wednesdays at 8 pm ET; we lock 1 hour before → 7 pm ET.
 *
 * Handles EST / EDT automatically by round-tripping through
 * toLocaleString with the America/New_York time zone.
 */
export function getLockTime(airDate: string): Date {
  // Treat airDate as "that calendar date at 19:00 in America/New_York"
  const naive = new Date(`${airDate}T19:00:00`);

  // Compute the UTC↔ET offset for that specific date (accounts for DST)
  const utcString = naive.toLocaleString("en-US", { timeZone: "UTC" });
  const etString = naive.toLocaleString("en-US", { timeZone: "America/New_York" });
  const offsetMs = new Date(utcString).getTime() - new Date(etString).getTime();

  return new Date(naive.getTime() + offsetMs);
}

export function isEpisodePastLockTime(airDate: string | null): boolean {
  if (!airDate) return false;
  return new Date() >= getLockTime(airDate);
}
