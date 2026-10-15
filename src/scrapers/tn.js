import { inspectHtml } from "../parse-common.js";

export function parseTnPage(page) {
  const result = inspectHtml(page.body, "tn", page.finalUrl);
  // Site-specific adapter hook:
  // Verified public text includes "Sinyal setup", "Pantauan 40 koin",
  // and "Jurnal sinyal Asgra". Exact selectors/data endpoints remain unverified.
  return { sourceId: "tn", url: page.finalUrl, fetchedAt: page.fetchedAt, ...result };
}
