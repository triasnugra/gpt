
import * as cheerio from "cheerio";

const PRICE = String.raw`(?:\$?\s*)?(\d+(?:[.,]\d+)*)`;

const patterns = {
  entry: new RegExp(
    String.raw`(?:entry\s*limit|entry|limit\s*entry)\s*[:=]?\s*${PRICE}`,
    "i"
  ),
  sl: new RegExp(
    String.raw`(?:stop[\s-]*loss|\bsl)\s*(?:\(?\s*([\d.,]+)\s*%\s*\)?)?\s*[:=]?\s*${PRICE}`,
    "i"
  ),
  tp: new RegExp(
    String.raw`(?:take[\s-]*profit|\btp\s*\d*\s*(?:\d+r)?)\s*[:=]?\s*${PRICE}`,
    "i"
  ),
  status: /\b(aktif|active|pending|menunggu|closed|selesai)\b/i
};

function parseNumeric(value) {
  if (value == null || value === "") return null;

  const normalized = String(value).replace(/,/g, "");
  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

export function extractSignalsFromText(text, sourceId, sourceUrl) {
  const lines = String(text)
    .split(/\n+/)
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const found = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Accept headings such as:
    // TRX LONG AKTIF
    // TRX SHORT
    // LONG TRX
    // TRX
    const tickerMatch = line.match(
      /^(?:(LONG|SHORT)\s+)?([A-Z0-9][A-Z0-9._-]{1,14})(?:\s+(LONG|SHORT))?(?:\s+(?:AKTIF|ACTIVE|PENDING|MENUNGGU|CLOSED|SELESAI))*$/i
    );

    if (!tickerMatch) continue;

    const ticker = tickerMatch[2].toUpperCase();
    const block = lines
      .slice(i, Math.min(lines.length, i + 12))
      .join(" · ");

    const entryMatch = block.match(patterns.entry);
    const slMatch = block.match(patterns.sl);
    const tpMatch = block.match(patterns.tp);
    const statusMatch = block.match(patterns.status);

    // Avoid treating arbitrary headings as signals.
    if (!entryMatch && !slMatch && !tpMatch) continue;

    const directionText = tickerMatch[1] || tickerMatch[3] || "";
    const direction = directionText
      ? directionText.toLowerCase()
      : /\bshort\b/i.test(line)
        ? "short"
        : /\blong\b/i.test(line)
          ? "long"
          : null;

    const confirmationMatch = block.match(
      /(?:konfirmasi|confirmation|alasan entry|reason)\s*[:=]\s*([^·]+)/i
    );

    const signal = {
      ticker,
      direction,
      entryLimit: entryMatch ? parseNumeric(entryMatch[1]) : null,
      slPercent: slMatch ? parseNumeric(slMatch[1]) : null,
      slPrice: slMatch ? parseNumeric(slMatch[2]) : null,
      tp: tpMatch ? [parseNumeric(tpMatch[1])] : [],
      status: statusMatch
        ? statusMatch[1].toLowerCase()
        : "unknown",
      confirmation: confirmationMatch
        ? confirmationMatch[1].trim()
        : null,
      sourceId,
      sourceUrl,
      rawText: block
    };

    const key = `${ticker}|${sourceUrl}|${signal.entryLimit}|${signal.slPrice}`;

    if (!seen.has(key)) {
      found.push(signal);
      seen.add(key);
    }
  }

  return found;
}

export function inspectHtml(html, sourceId, sourceUrl) {
  const $ = cheerio.load(html);

  $("script, style, noscript, svg").remove();

  const visibleText = $("body")
    .text()
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n");

  const signals = extractSignalsFromText(
    visibleText,
    sourceId,
    sourceUrl
  );

  const jsonScripts = [];
  const original = cheerio.load(html);

  original("script").each((_, el) => {
    const script = original(el);
    const type = String(script.attr("type") || "").toLowerCase();
    const content = script.html() || "";

    if (
      type.includes("json") ||
      /__NEXT_DATA__|__NUXT_DATA__|application\/ld\+json/i.test(
        type + " " + content.slice(0, 100)
      )
    ) {
      jsonScripts.push({
        type: type || "inline",
        length: content.length,
        preview: content.slice(0, 180)
      });
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
      note:
        "Rendered JavaScript state is not available to a plain HTTP scraper. Inspect linked JS and Network requests if data appears only after client-side loading."
    }
  };
}
