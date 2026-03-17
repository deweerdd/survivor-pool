import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";

type Contestant = Database["public"]["Tables"]["contestants"]["Row"];

async function createContestant(formData: FormData) {
  "use server";
  const name = (formData.get("name") as string)?.trim();
  const tribe = (formData.get("tribe") as string)?.trim() || null;
  const img_url = (formData.get("img_url") as string)?.trim() || null;

  if (!name) return;

  const supabase = await createClient();
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .single();

  if (!activeSeason) return;

  const adminClient = createAdminClient();
  await adminClient.from("contestants").insert({
    season_id: activeSeason.id,
    name,
    tribe,
    img_url,
    is_active: true,
  });
  revalidatePath("/admin/contestants");
}

export default async function ContestantsPage() {
  const supabase = await createClient();

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .single();

  const { data: contestants } = activeSeason
    ? await supabase
        .from("contestants")
        .select("*")
        .eq("season_id", activeSeason.id)
        .order("created_at", { ascending: true })
    : { data: null };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Contestants</h1>

      {!activeSeason ? (
        <p className="text-gray-500 text-sm">No active season.</p>
      ) : (
        <>
          <form action={createContestant} className="mb-8 flex gap-3 items-end flex-wrap">
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-sm font-medium">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="e.g. Jeff Probst"
                className="border rounded px-3 py-1.5 text-sm w-48"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="tribe" className="text-sm font-medium">
                Tribe <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="tribe"
                name="tribe"
                type="text"
                placeholder="e.g. Lavo"
                className="border rounded px-3 py-1.5 text-sm w-36"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="img_url" className="text-sm font-medium">
                Image URL <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="img_url"
                name="img_url"
                type="url"
                placeholder="https://..."
                className="border rounded px-3 py-1.5 text-sm w-64"
              />
            </div>
            <button
              type="submit"
              className="bg-black text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-800"
            >
              Add Contestant
            </button>
          </form>

          {!contestants || contestants.length === 0 ? (
            <p className="text-gray-500 text-sm">No contestants yet.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-6 font-medium">Name</th>
                  <th className="pb-2 pr-6 font-medium">Tribe</th>
                  <th className="pb-2 pr-6 font-medium">Status</th>
                  <th className="pb-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {contestants.map((contestant: Contestant) => (
                  <tr key={contestant.id} className="border-b">
                    <td className="py-2 pr-6">{contestant.name}</td>
                    <td className="py-2 pr-6">
                      {contestant.tribe ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-2 pr-6">
                      {contestant.is_active ? (
                        <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded">
                          Eliminated
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-gray-500">
                      {new Date(contestant.created_at).toLocaleDateString()}
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
