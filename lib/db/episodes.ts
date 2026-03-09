import { createClient } from "@/lib/supabase/server";
import type { Episode, Season, Survivor } from "@/lib/types";

export async function getEpisodesBySeasonId(seasonId: string): Promise<Episode[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("episodes")
    .select()
    .eq("season_id", seasonId)
    .order("episode_number", { ascending: true });

  if (error || !data) return [];
  return data as unknown as Episode[];
}

export async function getCurrentEpisode(seasonId: string): Promise<Episode | null> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // The current episode is the next one that hasn't aired/locked yet
  const { data: upcoming } = await supabase
    .from("episodes")
    .select()
    .eq("season_id", seasonId)
    .gt("picks_lock_at", now)
    .order("picks_lock_at", { ascending: true })
    .limit(1)
    .single();

  if (upcoming) return upcoming as unknown as Episode;

  // Fall back to most recent episode
  const { data: latest } = await supabase
    .from("episodes")
    .select()
    .eq("season_id", seasonId)
    .order("episode_number", { ascending: false })
    .limit(1)
    .single();

  return latest ? (latest as unknown as Episode) : null;
}

export async function getActiveSeason(): Promise<Season | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasons")
    .select()
    .eq("is_active", true)
    .single();

  if (error) return null;
  return data as unknown as Season;
}

export async function getAllSeasons(): Promise<Season[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasons")
    .select()
    .order("number", { ascending: false });

  if (error || !data) return [];
  return data as unknown as Season[];
}

export async function getSurvivorsBySeason(seasonId: string): Promise<Survivor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("survivors")
    .select()
    .eq("season_id", seasonId)
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data as unknown as Survivor[];
}

export async function getActiveSurvivors(seasonId: string): Promise<Survivor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("survivors")
    .select()
    .eq("season_id", seasonId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data as unknown as Survivor[];
}
