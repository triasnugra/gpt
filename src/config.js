export const SOURCES = [
  {
    id: "crypto",
    url: "https://triasnugra.github.io/crypto/",
    label: "ASGRA crypto dashboard"
  },
  {
    id: "tn",
    url: "https://triasnugra.github.io/tn/",
    label: "ASGRA journal"
  },
  {
    id: "view",
    url: "https://triasnugra.github.io/view/",
    label: "Crypto terminal"
  }
];

export const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 20000);
export const STALE_AFTER_MINUTES = Number(process.env.STALE_AFTER_MINUTES || 15);
export const OUTPUT_DIR = process.env.OUTPUT_DIR || "output";
export const STRICT_SOURCES = String(process.env.STRICT_SOURCES || "false").toLowerCase() === "true";
export const USER_AGENT = "CryptoSignalAggregator/1.0 (+public-page-monitor; contact repository maintainer)";
