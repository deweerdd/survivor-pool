import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { ScrapeButton } from "./ScrapeButton";
import { createSeason, activateSeason } from "@/lib/actions/seasons";

type Season = Database["public"]["Tables"]["seasons"]["Row"];

export default async function SeasonsPage() {
  const supabase = await createClient();
  const { data: seasons } = await supabase
    .from("seasons")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Seasons</h1>

      <form
        action={createSeason}
        className="mb-8 flex flex-col sm:flex-row gap-3 items-start sm:items-end"
      >
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
            className="input w-full sm:w-56"
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
            className="input w-full sm:w-72"
          />
        </div>
        <button type="submit" className="btn btn-primary btn-sm">
          Create Season
        </button>
      </form>

      {!seasons || seasons.length === 0 ? (
        <p className="text-gray-500 text-sm">No seasons yet.</p>
      ) : (
        <div className="overflow-x-auto">
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
                        className="text-primary hover:underline truncate max-w-xs block"
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
                        <button type="submit" className="btn btn-ghost btn-sm">
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
        </div>
      )}
    </div>
  );
}
