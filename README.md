# Crypto Signal Scraper & Aggregator

Scrapes three public pages, attempts conservative text parsing, normalizes signal fields, groups signals by ticker, detects conflicting values and stale data, and writes JSON output. The project is intentionally explicit about unknown website structure: the pages' static text was inspected, but their live DOM selectors and internal API endpoints have not been verified.

## Sources checked

1. `https://triasnugra.github.io/crypto/` — public page text exposes a search field, “Setup terkuat”, filters, and a BTC gate. Actual signal cards may be populated dynamically.
2. `https://triasnugra.github.io/tn/` — public page text exposes “Sinyal setup”, “Pantauan 40 koin”, and “Jurnal sinyal Asgra”. Exact card selectors/data payloads are not verified.
3. `https://triasnugra.github.io/view/` — public page text exposes UTC/WIB labels and “Memuat data Binance...”. Live prices may be fetched client-side, so the HTML response may contain no usable market data.

The adapters work as a starting baseline, but the generic text parser is heuristic and may yield zero signals until the pages' actual data shape is inspected. The output's `sourceSummary[].diagnostics` helps identify this.

## Requirements

- Node.js 20+
- Public access to the source pages
- No local database required

## Run locally (optional)

```bash
npm install
cp .env.example .env
npm test
npm run scrape
```

Generated files:
- `output/signals-latest.json` — normalized signal objects grouped by ticker
- `output/diagnostics-latest.json` — fetch/parse diagnostics for each source

These files are generated during each run. They are not persisted between GitHub Actions runs unless downloaded as workflow artifacts or explicitly stored elsewhere.

## GitHub deployment

1. Create a new GitHub repository and upload this project.
2. Ensure `.github/workflows/scrape.yml` is on the repository's default branch.
3. In **Settings → Actions → General**, allow the required workflow permissions. Current workflow only needs read access to repository contents because output is uploaded as an artifact.
4. In **Settings → Secrets and variables → Actions → Variables**, optionally set:
   - `REQUEST_TIMEOUT_MS` (e.g. `20000`)
   - `STALE_AFTER_MINUTES` (e.g. `15`)
   - `STRICT_SOURCES` (`false` or `true`)
5. Go to **Actions → Scrape crypto signals → Run workflow** to test manually.
6. Scheduled runs use `*/5 * * * *` (every 5 minutes, UTC). GitHub Actions does not support a reliable every-minute schedule. See https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onschedule
7. Download the `crypto-signals-N` artifact from each successful run to get JSON output.

No API keys are currently needed because the sources are public. Do not store passwords, cookies, or private tokens in source code. If an approved API later requires credentials, use **Settings → Secrets and variables → Actions → Secrets** and reference them as `${{ secrets.NAME }}`.

## JSON schema overview

Each `coins[TICKER]` object contains:
- `ticker`, `assetType`, `direction`
- `timestamp.publishedAtUtc`, `timestamp.fetchedAtUtc`, `timestamp.fetchedAtWib`
- `entry.type`, `entry.price`
- `stopLoss.price`, `stopLoss.percent`
- `takeProfit[]`
- `risk.usd`, `risk.quantity`, `risk.positionValueUsd`
- `status`: `active`, `pending`, `closed`, `cancelled`, `invalid`, or `unknown`
- `confirmation.reason`, `confirmation.timeframes`
- `sources[]` for per-source values
- `validation.stale`, `validation.conflicts`, `validation.sourceCount`

Missing fields remain `null`; they are not inferred. Ticker is used as the initial join key, but if sources include different instruments sharing a ticker, extend the key to include exchange/market/pair.

## Known limitations / next inspection

1. The pages are web apps. Static HTTP HTML cannot execute client-side JavaScript. If the actual cards appear only after scripts run, inspect linked JavaScript and browser DevTools → Network to identify the data file or public API call that supplies the signals.
2. Do not guess selectors. Once confirmed, add selectors or JSON extraction to the relevant adapter in `src/scrapers/crypto.js`, `tn.js`, or `view.js`.
3. The generic text parser only accepts a narrow ticker-heading/card-like layout and can miss content. Verify candidate values against actual source pages before relying on them.
4. `fetchedAtUtc` is scrape time, not necessarily the time the signal was created. If the source does not publish a timestamp, the parser must not pretend scrape time is publication time.
5. Conflicting source values are reported, not silently averaged. The canonical displayed signal is the newest published/fetched record, while all source values are retained.
6. Scraping is for research/monitoring; it does not place orders or provide financial advice.

## Firebase every-minute alternative

See [`firebase-adaptation/README.md`](firebase-adaptation/README.md). It describes the Firebase Cloud Functions + Firestore path. The included function intentionally fails closed until the scraper imports are wired, to prevent deployment from falsely reporting success with empty data.
