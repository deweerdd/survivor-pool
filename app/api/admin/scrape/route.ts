import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeContestants, scrapeEpisodes } from "@/lib/scraper";

export async function POST(req: NextRequest) {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const seasonId =
    body && typeof body === "object" && "seasonId" in body
      ? (body as Record<string, unknown>).seasonId
      : undefined;

  if (typeof seasonId !== "number" || !Number.isInteger(seasonId)) {
    return NextResponse.json(
      { error: "Missing or invalid seasonId (must be an integer)" },
      { status: 400 }
    );
  }

  // 3. Fetch season
  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, wiki_url")
    .eq("id", seasonId)
    .single();

  if (seasonError || !season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  if (!season.wiki_url) {
    return NextResponse.json(
      { error: "Season has no wiki_url" },
      { status: 400 }
    );
  }

  // 4. Call scraper
  let scrapeResult: Awaited<ReturnType<typeof scrapeContestants>>;
  try {
    scrapeResult = await scrapeContestants(season.wiki_url);
  } catch (err) {
    return NextResponse.json(
      { error: `Scraper failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }

  const { contestants: scraped, warnings } = scrapeResult;

  // 5. Upsert contestants (split to preserve is_active)
  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from("contestants")
    .select("wiki_slug")
    .eq("season_id", seasonId);

  if (fetchError) {
    return NextResponse.json(
      { error: `DB fetch failed: ${fetchError.message}` },
      { status: 500 }
    );
  }

  const existingSlugs = new Set((existing ?? []).map((r) => r.wiki_slug));

  const toInsert = scraped.filter(
    (c) => !existingSlugs.has(c.wiki_slug)
  );
  const toUpdate = scraped.filter(
    (c) => c.wiki_slug !== null && existingSlugs.has(c.wiki_slug)
  );

  // Insert new rows
  if (toInsert.length > 0) {
    const { error: insertError } = await admin.from("contestants").insert(
      toInsert.map((c) => ({
        season_id: seasonId,
        name: c.name,
        wiki_slug: c.wiki_slug,
        tribe: c.tribe,
        is_active: true,
      }))
    );
    if (insertError) {
      return NextResponse.json(
        { error: `DB insert failed: ${insertError.message}` },
        { status: 500 }
      );
    }
  }

  // Update existing rows (name + tribe only, preserve is_active)
  for (const c of toUpdate) {
    const { error: updateError } = await admin
      .from("contestants")
      .update({ name: c.name, tribe: c.tribe })
      .eq("season_id", seasonId)
      .eq("wiki_slug", c.wiki_slug!);

    if (updateError) {
      return NextResponse.json(
        { error: `DB update failed for "${c.wiki_slug}": ${updateError.message}` },
        { status: 500 }
      );
    }
  }

  // 6. Scrape episodes
  let episodeScrapeResult: Awaited<ReturnType<typeof scrapeEpisodes>>;
  try {
    episodeScrapeResult = await scrapeEpisodes(season.wiki_url);
  } catch (err) {
    return NextResponse.json(
      { error: `Episode scraper failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }

  const { episodes: scrapedEpisodes, warnings: episodeWarnings } = episodeScrapeResult;

  // 7. Fetch existing episodes for this season
  const { data: existingEpisodes, error: epFetchError } = await admin
    .from("episodes")
    .select("episode_number, is_locked")
    .eq("season_id", seasonId);

  if (epFetchError) {
    return NextResponse.json(
      { error: `DB fetch episodes failed: ${epFetchError.message}` },
      { status: 500 }
    );
  }

  const existingEpMap = new Map(
    (existingEpisodes ?? []).map((e) => [e.episode_number, e.is_locked])
  );

  // 8. Split into insert vs update (skip locked)
  const epsToInsert = scrapedEpisodes.filter((e) => !existingEpMap.has(e.episode_number));
  const epsToUpdate = scrapedEpisodes.filter(
    (e) => existingEpMap.has(e.episode_number) && existingEpMap.get(e.episode_number) === false
  );

  // 9. Insert new episodes
  if (epsToInsert.length > 0) {
    const { error: epInsertError } = await admin.from("episodes").insert(
      epsToInsert.map((e) => ({
        season_id: seasonId,
        episode_number: e.episode_number,
        title: e.title,
        air_date: e.air_date,
      }))
    );
    if (epInsertError) {
      return NextResponse.json(
        { error: `DB episode insert failed: ${epInsertError.message}` },
        { status: 500 }
      );
    }
  }

  // 10. Update unlocked existing episodes (title + air_date only)
  for (const e of epsToUpdate) {
    const { error: epUpdateError } = await admin
      .from("episodes")
      .update({ title: e.title, air_date: e.air_date })
      .eq("season_id", seasonId)
      .eq("episode_number", e.episode_number);

    if (epUpdateError) {
      return NextResponse.json(
        { error: `DB episode update failed for ep ${e.episode_number}: ${epUpdateError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    contestantsInserted: toInsert.length,
    contestantsUpdated: toUpdate.length,
    episodesInserted: epsToInsert.length,
    episodesUpdated: epsToUpdate.length,
    warnings,
    episodeWarnings,
  });
}
