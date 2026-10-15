import test from "node:test";
import assert from "node:assert/strict";
import { parseNumber, normalizeStatus, normalizeTicker, normalizeSignal } from "../src/normalize.js";

test("parseNumber handles numeric and currency/percent strings", () => {
  assert.equal(parseNumber(12.5), 12.5);
  assert.equal(parseNumber("$1.25"), 1.25);
  assert.equal(parseNumber("5.0%"), 5);
  assert.equal(parseNumber(""), null);
});

test("normalize status and ticker", () => {
  assert.equal(normalizeStatus("Aktif"), "active");
  assert.equal(normalizeStatus("Pending"), "pending");
  assert.equal(normalizeTicker(" trx "), "TRX");
  assert.equal(normalizeTicker("not a ticker"), null);
});

test("normalizes a TRX-like signal", () => {
  const s = normalizeSignal({
    ticker: "TRX", entryLimit: "0.327", slPrice: "0.311", slPercent: "5.0",
    tp: [{label:"TP 2R", price:"0.360"}], status:"Aktif",
    riskUsd: 1, quantity: 30.6, confirmation: "Retest tertahan di 4H"
  }, "crypto", "2026-10-14T09:17:12.000Z");
  assert.equal(s.ticker, "TRX");
  assert.equal(s.entry.price, 0.327);
  assert.equal(s.stopLoss.price, 0.311);
  assert.equal(s.status, "active");
  assert.equal(s.takeProfit[0].price, 0.36);
});
