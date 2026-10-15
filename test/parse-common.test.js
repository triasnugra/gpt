import test from "node:test";
import assert from "node:assert/strict";
import { extractSignalsFromText } from "../src/parse-common.js";

test("conservative parser can extract a simple card-like text fixture", () => {
  const text = `TRX LONG AKTIF
Entry limit 0.327
SL 5.0% 0.311
TP 2R 0.360
Konfirmasi: Retest tertahan di 4H`;
  const results = extractSignalsFromText(text, "fixture", "https://example.test");
  assert.equal(results.length, 1);
  assert.equal(results[0].ticker, "TRX");
  assert.equal(results[0].entryLimit, 0.327);
  assert.equal(results[0].slPrice, 0.311);
});
