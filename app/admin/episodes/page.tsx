import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";

type Episode = Database["public"]["Tables"]["episodes"]["Row"];

async function lockEpisode(formData: FormData) {
  "use server";
  const id = parseInt(formData.get("episode_id") as string, 10);
  if (!id) return;
  const adminClient = createAdminClient();
  await adminClient.from("episodes").update({ is_locked: true }).eq("id", id);
  revalidatePath("/admin/episodes");
}

async function createEpisode(formData: FormData) {
  "use server";
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

  if (!activeSeason) return;

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

export default async function EpisodesPage() {
  const supabase = await createClient();

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .single();

  const { data: episodes } = activeSeason
    ? await supabase
        .from("episodes")
        .select("*")
        .eq("season_id", activeSeason.id)
        .order("episode_number", { ascending: true })
    : { data: null };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Episodes</h1>

      {!activeSeason ? (
        <p className="text-gray-500 text-sm">No active season.</p>
      ) : (
        <>
          <form action={createEpisode} className="mb-8 flex gap-3 items-end flex-wrap">
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
                className="border rounded px-3 py-1.5 text-sm w-24"
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
                className="border rounded px-3 py-1.5 text-sm w-56"
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
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-6 font-medium">#</th>
                  <th className="pb-2 pr-6 font-medium">Title</th>
                  <th className="pb-2 pr-6 font-medium">Air Date</th>
                  <th className="pb-2 pr-6 font-medium">Locked</th>
                  <th className="pb-2 pr-6 font-medium">Created</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {episodes.map((episode: Episode) => (
                  <tr key={episode.id} className="border-b">
                    <td className="py-2 pr-6">{episode.episode_number}</td>
                    <td className="py-2 pr-6">
                      {episode.title ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-2 pr-6">
                      {episode.air_date ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-2 pr-6">
                      {episode.is_locked ? (
                        <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                          Locked
                        </span>
                      ) : (
                        <span className="inline-block bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded">
                          Open
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-6 text-gray-500">
                      {new Date(episode.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      {!episode.is_locked && (
                        <form action={lockEpisode}>
                          <input type="hidden" name="episode_id" value={episode.id} />
                          <button
                            type="submit"
                            className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                          >
                            Lock
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
