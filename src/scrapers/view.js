import { inspectHtml } from "../parse-common.js";

export function parseViewPage(page) {
  const result = inspectHtml(page.body, "view", page.finalUrl);
  // Site-specific adapter hook:
  // Verified public text includes UTC/WIB clock labels and "Memuat data Binance".
  // Dynamic market rows may be populated client-side; static HTML may not contain
  // prices. Inspect linked scripts/network requests before implementing API parsing.
  return { sourceId: "view", url: page.finalUrl, fetchedAt: page.fetchedAt, ...result };
}
