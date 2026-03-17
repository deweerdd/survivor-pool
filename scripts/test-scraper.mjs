/**
 * Quick dev script — tests the scraper logic against the live wiki page.
 * Run with: node scripts/test-scraper.mjs
 */
import * as cheerio from "cheerio";

const WIKI_URL =
  "https://survivor.fandom.com/wiki/Survivor_50:_In_the_Hands_of_the_Fans";

// ---------------------------------------------------------------------------
// MediaWiki API helpers (same logic as lib/scraper.ts)
// ---------------------------------------------------------------------------

function wikiApiBase(wikiUrl) {
  const url = new URL(wikiUrl);
  return `${url.protocol}//${url.host}/api.php`;
}

function pageTitle(wikiUrl) {
  return new URL(wikiUrl).pathname.replace("/wiki/", "");
}

async function fetchCastawaysHtml(wikiUrl) {
  const api = wikiApiBase(wikiUrl);
  const title = pageTitle(wikiUrl);

  // Step 1: find the section index for "Castaways"
  const sectionsRes = await fetch(
    `${api}?action=parse&page=${encodeURIComponent(title)}&prop=sections&format=json`,
    { headers: { "User-Agent": "survivor-pool-scraper/1.0" } }
  );
  if (!sectionsRes.ok) throw new Error(`Sections API ${sectionsRes.status}`);
  const sectionsData = await sectionsRes.json();

  const castawaysSection = sectionsData.parse.sections.find(
    (s) => s.line.toLowerCase() === "castaways"
  );
  if (!castawaysSection) throw new Error("Could not find Castaways section on page");

  // Step 2: fetch just that section's HTML
  const htmlRes = await fetch(
    `${api}?action=parse&page=${encodeURIComponent(title)}&prop=text&section=${castawaysSection.index}&format=json`,
    { headers: { "User-Agent": "survivor-pool-scraper/1.0" } }
  );
  if (!htmlRes.ok) throw new Error(`Section HTML API ${htmlRes.status}`);
  const htmlData = await htmlRes.json();
  return htmlData.parse.text["*"];
}

function parseContestants(html) {
  const $ = cheerio.load(html);
  const contestants = [];
  const warnings = [];

  // The castaway table is the first wikitable in this section
  const table = $("table.wikitable").first();
  if (!table.length) throw new Error("No wikitable found in Castaways section");

  table.find("tr").each((i, rowEl) => {
    const $row = $(rowEl);
    const cells = $row.find("td");

    // Need at least 3 cells: image | name | tribe
    if (cells.length < 3) return;

    // Name is in the 2nd cell (index 1), inside <b><a>
    const nameLink = $(cells[1]).find("b a[href^='/wiki/']").first();
    if (!nameLink.length) return;

    const href = nameLink.attr("href") ?? "";
    const wiki_slug = href.replace("/wiki/", "").trim();
    if (!wiki_slug) {
      warnings.push(`Row ${i}: could not parse wiki_slug from "${href}"`);
      return;
    }

    const name = nameLink.text().trim();
    if (!name) {
      warnings.push(`Slug "${wiki_slug}": could not parse name`);
      return;
    }

    // Tribe is the 3rd cell (index 2) — plain text, strip whitespace
    const tribe = $(cells[2]).text().trim() || null;

    if (contestants.some((c) => c.wiki_slug === wiki_slug)) return;

    contestants.push({ name, wiki_slug, tribe });
  });

  return { contestants, warnings };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function run() {
  console.log(`Fetching via MediaWiki API: ${WIKI_URL}\n`);

  const html = await fetchCastawaysHtml(WIKI_URL);
  const { contestants, warnings } = parseContestants(html);

  if (contestants.length === 0) {
    console.error("❌ Parsed 0 contestants — selectors may need updating");
    process.exit(1);
  }

  // Group by tribe
  const byTribe = {};
  for (const c of contestants) {
    const key = c.tribe ?? "(no tribe)";
    (byTribe[key] ??= []).push(c);
  }

  for (const [tribe, members] of Object.entries(byTribe)) {
    console.log(`── ${tribe} (${members.length})`);
    for (const c of members) {
      console.log(`   ${c.name.padEnd(30)} ${c.wiki_slug}`);
    }
    console.log();
  }

  console.log(`✅ Total: ${contestants.length} contestants`);

  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`);
    for (const w of warnings) console.log(`   ${w}`);
  }
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
