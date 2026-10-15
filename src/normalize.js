const STATUS_MAP = new Map([
  ["aktif", "active"], ["active", "active"], ["open", "active"],
  ["pending", "pending"], ["menunggu", "pending"], ["waiting", "pending"],
  ["closed", "closed"], ["selesai", "closed"], ["invalid", "invalid"],
  ["cancelled", "cancelled"], ["canceled", "cancelled"]
]);

export function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let s = String(value).trim().replace(/[$%]/g, "").replace(/\s/g, "");
  if (!s) return null;
  // Dot decimal is expected in scraped prices. Do not guess ambiguous locale formats.
  s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function normalizeStatus(value) {
  if (!value) return "unknown";
  const key = String(value).trim().toLowerCase();
  return STATUS_MAP.get(key) || "unknown";
}

export function normalizeTicker(value) {
  if (!value) return null;
  const ticker = String(value).trim().toUpperCase().replace(/^\$/, "");
  return /^[A-Z0-9][A-Z0-9._-]{0,19}$/.test(ticker) ? ticker : null;
}

export function normalizeSignal(raw, sourceId, fetchedAt) {
  const ticker = normalizeTicker(raw.ticker || raw.symbol || raw.coin);
  if (!ticker) return null;

  const entryPrice = parseNumber(raw.entry?.price ?? raw.entryLimit ?? raw.entry_limit ?? raw.entry);
  const slPrice = parseNumber(raw.stopLoss?.price ?? raw.sl?.price ?? raw.slPrice ?? raw.stop_loss);
  const slPercent = parseNumber(raw.stopLoss?.percent ?? raw.sl?.percent ?? raw.slPercent ?? raw.sl_percent);
  const rawTargets = raw.takeProfit ?? raw.targets ?? raw.tp;
  const targets = (Array.isArray(rawTargets) ? rawTargets : rawTargets == null ? [] : [rawTargets])
    .map((target, i) => {
      if (typeof target === "object" && target !== null) {
        return {
          label: String(target.label || target.name || `TP${i + 1}`),
          price: parseNumber(target.price ?? target.value)
        };
      }
      return { label: `TP${i + 1}`, price: parseNumber(target) };
    }).filter(t => t.price !== null);

  const qty = parseNumber(raw.risk?.quantity ?? raw.quantity ?? raw.qty);
  const riskUsd = parseNumber(raw.risk?.usd ?? raw.riskUsd ?? raw.risk_usd);
  const positionValue = parseNumber(raw.risk?.positionValueUsd ?? raw.positionValueUsd ?? raw.position_value_usd);
  const publishedAt = raw.publishedAt || raw.timestamp || raw.updatedAt || null;
  const publishedDate = publishedAt ? new Date(publishedAt) : null;
  const validPublishedAt = publishedDate && !Number.isNaN(publishedDate.getTime())
    ? publishedDate.toISOString() : null;

  return {
    ticker,
    assetType: raw.assetType || raw.asset_type || "unknown",
    direction: String(raw.direction || raw.side || "").toLowerCase() || null,
    timestamp: {
      publishedAtUtc: validPublishedAt,
      fetchedAtUtc: new Date(fetchedAt).toISOString(),
      fetchedAtWib: new Date(fetchedAt).toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" }).replace(" ", "T") + "+07:00"
    },
    entry: { type: raw.entry?.type || raw.entryType || "unknown", price: entryPrice },
    stopLoss: { price: slPrice, percent: slPercent },
    takeProfit: targets,
    risk: { usd: riskUsd, quantity: qty, positionValueUsd: positionValue },
    status: normalizeStatus(raw.status),
    confirmation: {
      reason: raw.confirmation?.reason || raw.confirmation || raw.reason || raw.entryReason || null,
      timeframes: Array.isArray(raw.confirmation?.timeframes) ? raw.confirmation.timeframes : []
    },
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    source: { id: sourceId, url: raw.sourceUrl || null },
    raw: raw.rawText ? { text: String(raw.rawText).slice(0, 1200) } : undefined
  };
}
