import { mkdir, writeFile } from "node:fs/promises";
import { SOURCES, OUTPUT_DIR, STALE_AFTER_MINUTES, STRICT_SOURCES } from "./config.js";
import { fetchPage } from "./fetch.js";
import { parseCryptoPage } from "./scrapers/crypto.js";
import { parseTnPage } from "./scrapers/tn.js";
import { parseViewPage } from "./scrapers/view.js";
import { aggregateByTicker } from "./aggregate.js";

const adapters = {
  crypto: parseCryptoPage,
  tn: parseTnPage,
  view: parseViewPage
};

const results = await Promise.all(SOURCES.map(async source => {
  try {
    const page = await fetchPage(source.url);
    return adapters[source.id](page);
  } catch (error) {
    return {
      sourceId: source.id, url: source.url, fetchedAt: new Date().toISOString(),
      signals: [], diagnostics: null, error: String(error?.message || error)
    };
  }
}));

const payload = aggregateByTicker(results, STALE_AFTER_MINUTES);
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(`${OUTPUT_DIR}/signals-latest.json`, JSON.stringify(payload, null, 2) + "\n");
await writeFile(`${OUTPUT_DIR}/diagnostics-latest.json`, JSON.stringify({
  generatedAtUtc: payload.generatedAtUtc,
  sources: results.map(({ sourceId, url, diagnostics, error, signalCount }) => ({
    sourceId, url, diagnostics, error: error || null, signalCount: signalCount ?? (diagnostics?.signalCount ?? 0)
  }))
}, null, 2) + "\n");

console.log(`Scrape finished: ${payload.count} ticker(s), output=${OUTPUT_DIR}/signals-latest.json`);
for (const source of payload.sourceSummary) {
  console.log(`[${source.ok ? "OK" : "ERROR"}] ${source.id}: ${source.signalCount} candidate signal(s)${source.error ? ` — ${source.error}` : ""}`);
}
if (STRICT_SOURCES && results.some(r => r.error)) process.exitCode = 1;
