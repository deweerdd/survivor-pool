/**
 * Pure business logic for Sole Survivor picks.
 *
 * Scoring: 2 points per episode remaining (inclusive) when the pick was made.
 * Formula: 2 × (totalEpisodes − pickedAtEpisode + 1)
 * Points only awarded if the picked contestant wins the season.
 */

/** Calculate bonus points for a correct Sole Survivor pick. */
export function calculateSoleSurvivorPoints(
  pickedAtEpisode: number,
  totalEpisodes: number
): number {
  if (pickedAtEpisode < 1 || totalEpisodes < 1 || pickedAtEpisode > totalEpisodes) return 0;
  return 2 * (totalEpisodes - pickedAtEpisode + 1);
}

/** Check if the user's picked contestant has been eliminated. */
export function isPickEliminated(contestantId: number, eliminatedContestantIds: number[]): boolean {
  return eliminatedContestantIds.includes(contestantId);
}
