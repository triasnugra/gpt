import * as cheerio from "cheerio";

// Heuristic fallback for text cards. These patterns are deliberately conservative:
// only create a signal when a ticker-like heading can be identified.
const PRICE = String.raw`(?:\$?\s*)?(\d+(?:[.,]\d+)*)`;
const patterns = {
  entry: new RegExp(String.raw`(?:entry\s*limit|entry|limit\s*entry)\s*[:=]?\s*${PRICE}`, "i"),
  sl: new RegExp(String.raw`(?:stop[\s-]*loss|\bsl)\s*(?:\(?\s*([\d.]+)\s*%\s*\)?)?\s*[:=]?\s*${PRICE}`, "i"),
  tp: new RegExp(String.raw`(?:take[\s-]*profit|\btp\s*\d*\s*(?:\d+r)?)\s*[:=]?\s*${PRICE}`, "i"),
  status: /\b(aktif|active|pending|menunggu|closed|selesai)\b/i
};

function parseNumeric(s) {
  if (!s) return null;
  const n = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function extractSignalsFromText(text, sourceId, sourceUrl) {
  const lines = text.split(/\n+/).map(s => s.replace(/\s+/g, " ").trim()).filter(Boolean);
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Source card headings are expected to be a ticker on a short line.
    const tickerMatch = line.match(/^(?:LONG\s+|SHORT\s+)?([A-Z0-9][A-Z0-9._-]{1,14})(?:\s+(?:LONG|SHORT|AKTIF|ACTIVE|PENDING))?$/i);
    if (!tickerMatch) continue;
    const block = lines.slice(i, Math.min(lines.length, i + 12)).join(" · ");
    const entryMatch = block.match(patterns.entry);
    const slMatch = block.match(patterns.sl);
    const tpMatch = block.match(patterns.tp);
    const statusMatch = block.match(patterns.status);
    const confirmationMatch = block.match(/(?:konfirmasi|confirmation|alasan entry|reason)\s*[:=]\s*([^·]+)/i);
    if (!entryMatch && !slMatch && !tpMatch) continue;
    found.push({
      ticker: tickerMatch[1],
      direction: /\bshort\b/i.test(line) ? "short" : /\blong\b/i.test(line) ? "long" : null,
      entryLimit: entryMatch ? parseNumeric(entryMatch[1]) : null,
      slPercent: slMatch ? parseNumeric(slMatch[1]) : null,
      slPrice: slMatch ? parseNumeric(slMatch[2]) : null,
      tp: tpMatch ? [parseNumeric(tpMatch[1])] : [],
      status: statusMatch ? statusMatch[1] : "unknown",
      confirmation: confirmationMatch ? confirmationMatch[1].trim() : null,
      sourceUrl,
      rawText: block
    });
  }
  return found;
}

export function inspectHtml(html, sourceId, sourceUrl) {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  const visibleText = $("body").text().replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n");
  const signals = extractSignalsFromText(visibleText, sourceId, sourceUrl);

  // Record machine-readable data blocks for diagnostics. These are NOT presumed
  // to be the website's API; they are embedded JSON only if the page contains it.
  const jsonScripts = [];
  cheerio.load(html)("script").each((_, el) => {
    const type = String(cheerio.load(html)(el).attr("type") || "").toLowerCase();
    const content = cheerio.load(html)(el).html() || "";
    if (type.includes("json") || /__NEXT_DATA__|__NUXT_DATA__|application\/ld\+json/i.test(type + " " + content.slice(0, 100))) {
      jsonScripts.push({ type: type || "inline", length: content.length, preview: content.slice(0, 180) });
    }
  });

  return {
    signals,
    diagnostics: {
      title: $("title").first().text().trim() || null,
      visibleTextLength: visibleText.length,
      visibleTextPreview: visibleText.slice(0, 900),
      candidateJsonScripts: jsonScripts,
      signalCount: signals.length,
      note: "Rendered JavaScript state is not available to a plain HTTP scraper. Inspect the page's linked JS and Network requests if data appears only after client-side loading."
    }
  };
}
