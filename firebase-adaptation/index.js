import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Copy ../src into this folder as ./src before deploying, then uncomment imports.
// import { SOURCES, STALE_AFTER_MINUTES } from "./src/config.js";
// import { fetchPage } from "./src/fetch.js";
// import { parseCryptoPage } from "./src/scrapers/crypto.js";
// import { parseTnPage } from "./src/scrapers/tn.js";
// import { parseViewPage } from "./src/scrapers/view.js";
// import { aggregateByTicker } from "./src/aggregate.js";

initializeApp();
const db = getFirestore();

export const scrapeEveryMinute = onSchedule("every 1 minutes", async () => {
  // Replace this guard with the same fetch/parse/aggregate block used in src/index.js.
  // This fail-closed scaffold prevents accidental deployment of a function that
  // silently writes fabricated or empty market signals.
  throw new Error(
    "Setup required: copy the root src/ directory into firebase-adaptation/src/ and wire fetch/parse/aggregate imports before deployment."
  );

  // Example Firestore write once payload is created:
  // const batch = db.batch();
  // for (const [ticker, signal] of Object.entries(payload.coins)) {
  //   batch.set(db.collection("signalsLatest").doc(ticker), {
  //     ...signal,
  //     updatedAt: FieldValue.serverTimestamp()
  //   }, { merge: true });
  // }
  // batch.set(db.collection("scrapeRuns").doc(payload.generatedAtUtc), {
  //   generatedAtUtc: payload.generatedAtUtc,
  //   count: payload.count,
  //   sourceSummary: payload.sourceSummary
  // });
  // await batch.commit();
});
