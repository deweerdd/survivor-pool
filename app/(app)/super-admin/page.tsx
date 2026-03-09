// Server component — super admin panel
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/db/profiles";
import { getAllSeasons, getSurvivorsBySeason, getEpisodesBySeasonId } from "@/lib/db/episodes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeasonsTab } from "./seasons-tab";
import { CastTab } from "./cast-tab";
import { EpisodesTab } from "./episodes-tab";

export default async function SuperAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin = await isSuperAdmin(user.id);
  if (!isAdmin) redirect("/dashboard");

  const seasons = await getAllSeasons();
  const activeSeason = seasons.find((s) => s.is_active) ?? seasons[0] ?? null;

  const [survivors, episodes] = activeSeason
    ? await Promise.all([
        getSurvivorsBySeason(activeSeason.id),
        getEpisodesBySeasonId(activeSeason.id),
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
        <p className="text-gray-500 mt-1">Manage seasons, cast, and episodes</p>
      </div>

      <Tabs defaultValue="seasons">
        <TabsList>
          <TabsTrigger value="seasons">Seasons</TabsTrigger>
          <TabsTrigger value="cast">Cast</TabsTrigger>
          <TabsTrigger value="episodes">Episodes</TabsTrigger>
        </TabsList>

        <TabsContent value="seasons" className="mt-4">
          <SeasonsTab seasons={seasons} />
        </TabsContent>

        <TabsContent value="cast" className="mt-4">
          <CastTab
            survivors={survivors}
            seasons={seasons}
            activeSeason={activeSeason}
          />
        </TabsContent>

        <TabsContent value="episodes" className="mt-4">
          <EpisodesTab
            episodes={episodes}
            seasons={seasons}
            activeSeason={activeSeason}
            survivors={survivors}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
