import { normalizeSignal } from "./normalize.js";

function stableComparable(signal) {
  return JSON.stringify({
    direction: signal.direction,
    entry: signal.entry.price,
    sl: signal.stopLoss.price,
    slPercent: signal.stopLoss.percent,
    tp: signal.takeProfit.map(t => t.price).sort((a,b) => a-b),
    status: signal.status
  });
}

export function aggregateByTicker(sourceResults, staleAfterMinutes = 15, now = new Date()) {
  const signals = [];
  for (const result of sourceResults) {
    for (const raw of result.signals || []) {
      const normalized = normalizeSignal(raw, result.sourceId, result.fetchedAt);
      if (normalized) signals.push(normalized);
    }
  }

  const grouped = new Map();
  for (const signal of signals) {
    if (!grouped.has(signal.ticker)) grouped.set(signal.ticker, []);
    grouped.get(signal.ticker).push(signal);
  }

  const coins = {};
  for (const [ticker, items] of grouped.entries()) {
    const signatures = new Set(items.map(stableComparable));
    const newestFirst = [...items].sort((a,b) =>
      new Date(b.timestamp.publishedAtUtc || b.timestamp.fetchedAtUtc) -
      new Date(a.timestamp.publishedAtUtc || a.timestamp.fetchedAtUtc)
    );
    const canonical = newestFirst[0];
    const sourceTimes = items.map(s => new Date(s.timestamp.publishedAtUtc || s.timestamp.fetchedAtUtc).getTime());
    const newestTime = Math.max(...sourceTimes);
    const ageMinutes = Math.max(0, (now.getTime() - newestTime) / 60000);
    const stale = ageMinutes > staleAfterMinutes;
    const conflicts = signatures.size > 1
      ? ["Nilai sinyal antar-sumber berbeda; periksa sumber sebelum digunakan."]
      : [];

    coins[ticker] = {
      ...canonical,
      sources: items.map(s => ({
        id: s.source.id,
        url: s.source.url,
        publishedAtUtc: s.timestamp.publishedAtUtc,
        fetchedAtUtc: s.timestamp.fetchedAtUtc,
        entry: s.entry.price,
        stopLoss: s.stopLoss.price,
        status: s.status
      })),
      validation: {
        stale,
        ageMinutes: Number(ageMinutes.toFixed(2)),
        conflicts,
        sourceCount: new Set(items.map(s => s.source.id)).size,
        signalCount: items.length
      }
    };
  }

  return {
    schemaVersion: "1.0.0",
    generatedAtUtc: now.toISOString(),
    generatedAtWib: new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "medium"
    }).format(now).replace(" ", "T") + "+07:00",
    sourceSummary: sourceResults.map(s => ({
      id: s.sourceId, url: s.url, ok: !s.error,
      signalCount: (s.signals || []).length,
      error: s.error || null,
      diagnostics: s.diagnostics || null
    })),
    count: Object.keys(coins).length,
    coins
  };
}
