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

const SCRAPER_UA = "survivor-pool-scraper/1.0";

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


// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchCastawaysHtml(wikiUrl: string): Promise<string> {
  const api = wikiApiBase(wikiUrl);
  const title = pageTitle(wikiUrl);

  // Step 1: find the section index for "Castaways"
  const sectionsRes = await fetch(
    `${api}?action=parse&page=${encodeURIComponent(title)}&prop=sections&format=json`,
    { headers: { "User-Agent": SCRAPER_UA } }
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
  const htmlRes = await fetch(
    `${api}?action=parse&page=${encodeURIComponent(title)}&prop=text&section=${castawaysSection.index}&format=json`,
    { headers: { "User-Agent": SCRAPER_UA } }
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
