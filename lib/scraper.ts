import "server-only";
import * as cheerio from "cheerio";

export interface ScrapedContestant {
  name: string;
  wiki_slug: string;
  tribe: string | null;
}

export interface ScrapeResult {
  contestants: ScrapedContestant[];
  warnings: string[];
}

export interface ScrapedEpisode {
  episode_number: number;
  title: string | null;
  air_date: string | null; // ISO date "YYYY-MM-DD" or null
}

export interface EpisodeScrapeResult {
  episodes: ScrapedEpisode[];
  warnings: string[];
}

const SCRAPER_UA = "survivor-pool-scraper/1.0";

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
    }
    const res = await fetch(url, { headers: { "User-Agent": SCRAPER_UA } });
    if (res.ok) return res;
    lastStatus = res.status;
    // Only retry on server errors
    if (res.status < 500) return res;
  }
  throw new Error(`MediaWiki API returned ${lastStatus} after ${retries} attempts`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches the Survivor fandom wiki page at `wikiUrl` via the MediaWiki API
 * and returns all castaways with their names, wiki slugs, and original tribes.
 *
 * Throws if the page cannot be fetched or the castaway table is not found.
 * Individual row parse failures are collected in `warnings`.
 */
export async function scrapeContestants(wikiUrl: string): Promise<ScrapeResult> {
  const html = await fetchCastawaysHtml(wikiUrl);
  return parseContestants(html);
}


/**
 * Fetches the Survivor fandom wiki page at `wikiUrl` via the MediaWiki API
 * and returns episodes with their numbers, titles, and air dates.
 *
 * Throws if the page cannot be fetched or the episodes table is not found.
 * Individual row parse failures are collected in `warnings`.
 */
export async function scrapeEpisodes(wikiUrl: string): Promise<EpisodeScrapeResult> {
  const html = await fetchEpisodesHtml(wikiUrl);
  return parseEpisodes(html);
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchEpisodesHtml(wikiUrl: string): Promise<string> {
  const api = wikiApiBase(wikiUrl);
  const title = pageTitle(wikiUrl);

  const sectionsRes = await fetchWithRetry(
    `${api}?action=parse&page=${encodeURIComponent(title)}&prop=sections&format=json`
  );
  if (!sectionsRes.ok) {
    throw new Error(`MediaWiki sections API returned ${sectionsRes.status} for ${wikiUrl}`);
  }

  const sectionsData = await sectionsRes.json();
  const EPISODE_SECTION_NAMES = ["episodes", "episode guide", "episode list", "season summary"];
  const sections: { line: string; index: string }[] = sectionsData.parse?.sections ?? [];
  const episodesSection = sections.find((s) =>
    EPISODE_SECTION_NAMES.includes(s.line.toLowerCase())
  );
  if (!episodesSection) {
    const available = sections.map((s) => `"${s.line}"`).join(", ") || "none";
    throw new Error(
      `Could not find an episodes section on ${wikiUrl}. Available sections: ${available}`
    );
  }

  const htmlRes = await fetchWithRetry(
    `${api}?action=parse&page=${encodeURIComponent(title)}&prop=text&section=${episodesSection.index}&format=json`
  );
  if (!htmlRes.ok) {
    throw new Error(`MediaWiki section HTML API returned ${htmlRes.status}`);
  }

  const htmlData = await htmlRes.json();
  const html: string | undefined = htmlData.parse?.text?.["*"];
  if (!html) throw new Error("MediaWiki API returned no HTML for Episodes section");

  return html;
}

async function fetchCastawaysHtml(wikiUrl: string): Promise<string> {
  const api = wikiApiBase(wikiUrl);
  const title = pageTitle(wikiUrl);

  // Step 1: find the section index for "Castaways"
  const sectionsRes = await fetchWithRetry(
    `${api}?action=parse&page=${encodeURIComponent(title)}&prop=sections&format=json`
  );
  if (!sectionsRes.ok) {
    throw new Error(`MediaWiki sections API returned ${sectionsRes.status} for ${wikiUrl}`);
  }

  const sectionsData = await sectionsRes.json();
  const castawaysSection = sectionsData.parse?.sections?.find(
    (s: { line: string }) => s.line.toLowerCase() === "castaways"
  );
  if (!castawaysSection) {
    throw new Error(`Could not find a "Castaways" section on ${wikiUrl}`);
  }

  // Step 2: fetch just that section's rendered HTML
  const htmlRes = await fetchWithRetry(
    `${api}?action=parse&page=${encodeURIComponent(title)}&prop=text&section=${castawaysSection.index}&format=json`
  );
  if (!htmlRes.ok) {
    throw new Error(`MediaWiki section HTML API returned ${htmlRes.status}`);
  }

  const htmlData = await htmlRes.json();
  const html: string | undefined = htmlData.parse?.text?.["*"];
  if (!html) throw new Error("MediaWiki API returned no HTML for Castaways section");

  return html;
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

function parseEpisodes(html: string): EpisodeScrapeResult {
  const $ = cheerio.load(html);
  const episodes: ScrapedEpisode[] = [];
  const warnings: string[] = [];

  const table = $("table.wikitable").first();
  if (!table.length) {
    throw new Error("No wikitable found in Episodes section — page structure may have changed");
  }

  table.find("tr").each((i, rowEl) => {
    const $row = $(rowEl);

    // Skip header rows
    if ($row.find("th").length > 0 && $row.find("td").length === 0) return;

    const cells = $row.find("td");
    if (cells.length < 3) return;

    // Cell[0]: episode number
    const epNumText = $(cells[0]).text().trim();
    const epNum = parseInt(epNumText, 10);
    if (!Number.isInteger(epNum) || isNaN(epNum)) {
      warnings.push(`Row ${i}: could not parse episode number from "${epNumText}"`);
      return;
    }

    // Cell[1]: title
    const title = $(cells[1]).text().trim() || null;

    // Cell[2]: air date
    const rawDate = $(cells[2]).text().trim();
    const air_date = parseDateString(rawDate);

    // Deduplicate by episode_number
    if (episodes.some((e) => e.episode_number === epNum)) return;

    episodes.push({ episode_number: epNum, title, air_date });
  });

  return { episodes, warnings };
}

function parseDateString(raw: string): string | null {
  // Strip wiki citations like [1], [2], etc.
  const cleaned = raw.replace(/\[\d+\]/g, "").trim();

  // Match "Month DD, YYYY"
  const match = cleaned.match(/([A-Za-z]+ \d{1,2},\s*\d{4})/);
  if (!match) return null;

  const d = new Date(match[1]);
  if (isNaN(d.getTime())) return null;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseContestants(html: string): ScrapeResult {
  const $ = cheerio.load(html);
  const contestants: ScrapedContestant[] = [];
  const warnings: string[] = [];

  // The castaway table is the first wikitable in this section.
  // Columns: [image] | [name] | [original tribe] | [switched tribe?] | ...
  const table = $("table.wikitable").first();
  if (!table.length) {
    throw new Error("No wikitable found in Castaways section — page structure may have changed");
  }

  table.find("tr").each((i, rowEl) => {
    const $row = $(rowEl);
    const cells = $row.find("td");

    // Need at least 3 data cells: image | name | tribe
    if (cells.length < 3) return;

    // Name is in the 2nd cell (index 1), inside <b><a href="/wiki/...">
    const nameLink = $(cells[1]).find("b a[href^='/wiki/']").first();
    if (!nameLink.length) return;

    const href = nameLink.attr("href") ?? "";
    const wiki_slug = href.replace("/wiki/", "").trim();
    if (!wiki_slug) {
      warnings.push(`Row ${i}: could not parse wiki_slug from href "${href}"`);
      return;
    }

    const name = nameLink.text().trim();
    if (!name) {
      warnings.push(`Slug "${wiki_slug}": could not parse contestant name`);
      return;
    }

    // Original tribe is the 3rd cell (index 2)
    const tribe = $(cells[2]).text().trim() || null;

    // Deduplicate — a contestant should only appear once
    if (contestants.some((c) => c.wiki_slug === wiki_slug)) return;

    contestants.push({ name, wiki_slug, tribe });
  });

  if (contestants.length === 0) {
    throw new Error(
      "Parsed 0 contestants — wikitable found but no rows matched expected structure"
    );
  }

  return { contestants, warnings };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wikiApiBase(wikiUrl: string): string {
  const url = new URL(wikiUrl);
  return `${url.protocol}//${url.host}/api.php`;
}

function pageTitle(wikiUrl: string): string {
  return new URL(wikiUrl).pathname.replace("/wiki/", "");
}
