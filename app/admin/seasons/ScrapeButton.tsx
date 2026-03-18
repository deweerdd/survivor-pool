"use client";

import { useState } from "react";

interface ScrapeResult {
  contestantsInserted: number;
  contestantsUpdated: number;
  episodesInserted: number;
  episodesUpdated: number;
  eliminationsUpserted: number;
  warnings: string[];
  episodeWarnings: string[];
  eliminationWarnings: string[];
}

export function ScrapeButton({ seasonId }: { seasonId: number }) {
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "success"; result: ScrapeResult }
    | { type: "error"; message: string }
  >({ type: "idle" });

  async function handleScrape() {
    setStatus({ type: "loading" });
    try {
      const res = await fetch("/api/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", message: data.error ?? `HTTP ${res.status}` });
      } else {
        setStatus({ type: "success", result: data as ScrapeResult });
      }
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleScrape}
        disabled={status.type === "loading"}
        className="text-sm text-purple-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed text-left"
      >
        {status.type === "loading" ? "Scraping…" : "Scrape wiki"}
      </button>
      {status.type === "success" && (
        <span className="text-xs text-green-700 flex flex-col gap-0.5">
          <span>
            Contestants: {status.result.contestantsInserted} inserted,{" "}
            {status.result.contestantsUpdated} updated.
          </span>
          {status.result.warnings.map((w, i) => (
            <span key={i} className="text-yellow-600">
              ⚠ {w}
            </span>
          ))}
          <span>
            Episodes: {status.result.episodesInserted} inserted, {status.result.episodesUpdated}{" "}
            updated.
          </span>
          {status.result.episodeWarnings.map((w, i) => (
            <span key={i} className="text-yellow-600">
              ⚠ {w}
            </span>
          ))}
          <span>Eliminations: {status.result.eliminationsUpserted} upserted.</span>
          {status.result.eliminationWarnings.map((w, i) => (
            <span key={i} className="text-yellow-600">
              ⚠ {w}
            </span>
          ))}
        </span>
      )}
      {status.type === "error" && <span className="text-xs text-red-600">{status.message}</span>}
    </div>
  );
}
