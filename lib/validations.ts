import { z } from "zod";

// Max points a player can allocate per episode
export const MAX_POINTS_PER_EPISODE = 20;

export const createPoolSchema = z.object({
  name: z.string().min(2, "Pool name must be at least 2 characters").max(100),
  season_id: z.string().uuid("Invalid season"),
});

export const submitPicksSchema = z.object({
  pool_id: z.string().uuid(),
  episode_id: z.string().uuid(),
  picks: z
    .array(
      z.object({
        survivor_id: z.string().uuid(),
        points: z.number().int().min(0).max(MAX_POINTS_PER_EPISODE),
      })
    )
    .refine(
      (picks) => {
        const total = picks.reduce((sum, p) => sum + p.points, 0);
        return total <= MAX_POINTS_PER_EPISODE;
      },
      {
        message: `Total points cannot exceed ${MAX_POINTS_PER_EPISODE}`,
      }
    )
    // Filter out zero-point picks before saving
    .transform((picks) => picks.filter((p) => p.points > 0)),
});

export const createSeasonSchema = z.object({
  name: z.string().min(2).max(100),
  number: z.number().int().positive(),
});

export const createSurvivorSchema = z.object({
  season_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  image_url: z.string().url().optional().or(z.literal("")),
});

export const createEpisodeSchema = z.object({
  season_id: z.string().uuid(),
  episode_number: z.number().int().positive(),
  air_date: z.string().datetime({ offset: true }),
  picks_lock_at: z.string().datetime({ offset: true }),
  results_release_at: z.string().datetime({ offset: true }),
});

export const recordEliminationSchema = z.object({
  survivor_id: z.string().uuid(),
  episode_id: z.string().uuid(),
});

export type CreatePoolInput = z.infer<typeof createPoolSchema>;
export type SubmitPicksInput = z.infer<typeof submitPicksSchema>;
export type CreateSeasonInput = z.infer<typeof createSeasonSchema>;
export type CreateSurvivorInput = z.infer<typeof createSurvivorSchema>;
export type CreateEpisodeInput = z.infer<typeof createEpisodeSchema>;
export type RecordEliminationInput = z.infer<typeof recordEliminationSchema>;
