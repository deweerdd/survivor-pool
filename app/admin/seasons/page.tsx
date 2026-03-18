import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";
import { ScrapeButton } from "./ScrapeButton";

type Season = Database["public"]["Tables"]["seasons"]["Row"];

async function createSeason(formData: FormData) {
  "use server";
  const name = (formData.get("name") as string)?.trim();
  const wiki_url = (formData.get("wiki_url") as string)?.trim() || null;

  if (!name) return;

  const adminClient = createAdminClient();
  await adminClient.from("seasons").insert({ name, wiki_url, is_active: false });
  revalidatePath("/admin/seasons");
}

async function activateSeason(formData: FormData) {
  "use server";
  const seasonId = Number(formData.get("seasonId"));
  if (!seasonId) return;

  const adminClient = createAdminClient();
  await adminClient.from("seasons").update({ is_active: false }).neq("id", seasonId);
  await adminClient.from("seasons").update({ is_active: true }).eq("id", seasonId);

  // Auto-create public pool if one doesn't exist yet
  const { data: season } = await adminClient
    .from("seasons")
    .select("name")
    .eq("id", seasonId)
    .single();

  const { data: existingPool } = await adminClient
    .from("pools")
    .select("id")
    .eq("season_id", seasonId)
    .eq("is_public", true)
    .maybeSingle();

  if (season && !existingPool) {
    await adminClient.from("pools").insert({
      season_id: seasonId,
      name: season.name,
      is_public: true,
      invite_code: null,
      created_by: null,
    });
  }

  revalidatePath("/admin/seasons");
}

export default async function SeasonsPage() {
  const supabase = await createClient();
  const { data: seasons } = await supabase
    .from("seasons")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Seasons</h1>

      <form action={createSeason} className="mb-8 flex gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. Survivor 47"
            className="border rounded px-3 py-1.5 text-sm w-56"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="wiki_url" className="text-sm font-medium">
            Wiki URL <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="wiki_url"
            name="wiki_url"
            type="url"
            placeholder="https://survivor.fandom.com/..."
            className="border rounded px-3 py-1.5 text-sm w-72"
          />
        </div>
        <button
          type="submit"
          className="bg-black text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-800"
        >
          Create Season
        </button>
      </form>

      {!seasons || seasons.length === 0 ? (
        <p className="text-gray-500 text-sm">No seasons yet.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 pr-6 font-medium">Name</th>
              <th className="pb-2 pr-6 font-medium">Wiki URL</th>
              <th className="pb-2 pr-6 font-medium">Status</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {seasons.map((season: Season) => (
              <tr key={season.id} className="border-b">
                <td className="py-2 pr-6">{season.name}</td>
                <td className="py-2 pr-6">
                  {season.wiki_url ? (
                    <a
                      href={season.wiki_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate max-w-xs block"
                    >
                      {season.wiki_url}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-2 pr-6">
                  {season.is_active ? (
                    <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">Inactive</span>
                  )}
                </td>
                <td className="py-2 flex gap-4 items-start">
                  {!season.is_active && (
                    <form action={activateSeason}>
                      <input type="hidden" name="seasonId" value={season.id} />
                      <button type="submit" className="text-sm text-blue-600 hover:underline">
                        Activate
                      </button>
                    </form>
                  )}
                  {season.wiki_url && <ScrapeButton seasonId={season.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
