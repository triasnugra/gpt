import { inspectHtml } from "../parse-common.js";

export function parseCryptoPage(page) {
  const result = inspectHtml(page.body, "crypto", page.finalUrl);
  // Site-specific adapter hook:
  // Verified from public page text: search input, "Setup terkuat", filters,
  // and BTC gate are present. No signal-card DOM selectors were verified by
  // the static HTML view, so use conservative text parsing plus diagnostics.
  return { sourceId: "crypto", url: page.finalUrl, fetchedAt: page.fetchedAt, ...result };
}
