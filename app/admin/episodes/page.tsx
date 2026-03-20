import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Database } from "@/lib/supabase/database.types";
import { requireAdmin } from "@/lib/admin-guard";

type Episode = Database["public"]["Tables"]["episodes"]["Row"];
type Contestant = Pick<Database["public"]["Tables"]["contestants"]["Row"], "id" | "name">;

async function lockEpisode(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = parseInt(formData.get("episode_id") as string, 10);
  if (!id) return;
  const adminClient = createAdminClient();
  await adminClient.from("episodes").update({ is_locked: true }).eq("id", id);
  revalidatePath("/admin/episodes");
}

async function createEpisode(formData: FormData) {
  "use server";
  await requireAdmin();
  const episode_number = parseInt(formData.get("episode_number") as string, 10);
  const title = (formData.get("title") as string)?.trim() || null;
  const air_date = (formData.get("air_date") as string)?.trim() || null;

  if (!episode_number) return;

  const supabase = await createClient();
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .single();

  if (!activeSeason) redirect("/admin/episodes?error=no_season");

  const adminClient = createAdminClient();
  await adminClient.from("episodes").insert({
    season_id: activeSeason.id,
    episode_number,
    title,
    air_date,
    is_locked: false,
  });
  revalidatePath("/admin/episodes");
}

async function recordElimination(formData: FormData) {
  "use server";
  await requireAdmin();
  const episode_id = parseInt(formData.get("episode_id") as string, 10);
  const contestant_id = parseInt(formData.get("contestant_id") as string, 10);
  if (!episode_id || !contestant_id) return;

  const adminClient = createAdminClient();
  await adminClient.from("eliminations").insert({ episode_id, contestant_id });
  await adminClient.from("contestants").update({ is_active: false }).eq("id", contestant_id);
  revalidatePath("/admin/episodes");
}

export default async function EpisodesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .single();

  const [episodesResult, contestantsResult] = activeSeason
    ? await Promise.all([
        supabase
          .from("episodes")
          .select("*")
          .eq("season_id", activeSeason.id)
          .order("episode_number", { ascending: true }),
        supabase
          .from("contestants")
          .select("id, name")
          .eq("season_id", activeSeason.id)
          .eq("is_active", true)
          .order("name", { ascending: true }),
      ])
    : [{ data: null }, { data: null }];

  const episodes = episodesResult.data;
  const activeContestants: Contestant[] = (contestantsResult.data ?? []) as Contestant[];

  const episodeIds = (episodes ?? []).map((e: Episode) => e.id);
  const { data: eliminations } =
    episodeIds.length > 0
      ? await supabase
          .from("eliminations")
          .select("episode_id, contestant_id, contestants(name)")
          .in("episode_id", episodeIds)
      : { data: [] };

  // Group eliminations by episode_id
  const eliminationsByEpisode = new Map<number, { contestant_id: number; name: string }[]>();
  for (const elim of eliminations ?? []) {
    const name = (elim.contestants as { name: string } | null)?.name ?? "Unknown";
    const list = eliminationsByEpisode.get(elim.episode_id) ?? [];
    list.push({ contestant_id: elim.contestant_id, name });
    eliminationsByEpisode.set(elim.episode_id, list);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Episodes</h1>

      {error === "no_season" && (
        <p className="mb-4 text-sm text-red-600">
          No active season. Cannot add episodes right now.
        </p>
      )}

      {!activeSeason ? (
        <p className="text-gray-500 text-sm">No active season.</p>
      ) : (
        <>
          <form
            action={createEpisode}
            className="mb-8 flex flex-col sm:flex-row gap-3 items-start sm:items-end flex-wrap"
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="episode_number" className="text-sm font-medium">
                Episode # <span className="text-red-500">*</span>
              </label>
              <input
                id="episode_number"
                name="episode_number"
                type="number"
                required
                min={1}
                placeholder="1"
                className="border rounded px-3 py-1.5 text-sm w-full sm:w-24"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="title" className="text-sm font-medium">
                Title <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="e.g. It's a New Era"
                className="border rounded px-3 py-1.5 text-sm w-full sm:w-56"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="air_date" className="text-sm font-medium">
                Air Date <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="air_date"
                name="air_date"
                type="date"
                className="border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-black text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-800"
            >
              Add Episode
            </button>
          </form>

          {!episodes || episodes.length === 0 ? (
            <p className="text-gray-500 text-sm">No episodes yet.</p>
          ) : (
            <div className="space-y-3">
              {episodes.map((episode: Episode) => {
                const episodeEliminations = eliminationsByEpisode.get(episode.id) ?? [];
                const eliminatedIds = new Set(episodeEliminations.map((e) => e.contestant_id));
                const availableContestants = activeContestants.filter(
                  (c) => !eliminatedIds.has(c.id)
                );

                return (
                  <div key={episode.id} className="border rounded p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="font-medium text-sm w-8">#{episode.episode_number}</span>
                      <span className="text-sm flex-1 min-w-0">
                        {episode.title ?? <span className="text-gray-400">Untitled</span>}
                      </span>
                      <span className="text-sm text-gray-500">
                        {episode.air_date ?? <span className="text-gray-400">No date</span>}
                      </span>
                      {episode.is_locked ? (
                        <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                          Locked
                        </span>
                      ) : (
                        <form action={lockEpisode} className="inline">
                          <input type="hidden" name="episode_id" value={episode.id} />
                          <button
                            type="submit"
                            className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                          >
                            Lock
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Eliminations section */}
                    <div className="mt-3 pl-0 sm:pl-12">
                      {episodeEliminations.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {episodeEliminations.map((elim) => (
                            <span
                              key={elim.contestant_id}
                              className="inline-block bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded"
                            >
                              ✕ {elim.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {availableContestants.length > 0 ? (
                        <form action={recordElimination} className="flex gap-2 items-center">
                          <input type="hidden" name="episode_id" value={episode.id} />
                          <select
                            name="contestant_id"
                            required
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="">— pick contestant —</option>
                            {availableContestants.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Record Elimination
                          </button>
                        </form>
                      ) : (
                        episodeEliminations.length === 0 && (
                          <p className="text-gray-400 text-xs">
                            No active contestants to eliminate.
                          </p>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
