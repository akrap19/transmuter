# Transmuter API

Fastify read-model API over MySQL, with Redis in front of hot coin queries, a local media store for logos, and an indexer worker that fills the catalog from Factory/EOL logs.

The database is a rebuildable cache of the Factory registry. It is not the source of truth for balances, backing, or payouts.

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/health` | Liveness |
| `GET` | `/coins` | List/search/sort/filter/paginate. Query: `q`, `status` (repeatable), `backing`, `sort`, `dir`, `limit`, `offset`. Includes VOIDED. |
| `GET` | `/coins/:mint` | Indexed detail + latest chart points |
| `GET` | `/coins/:mint/chart` | `{ points: [{ t, priceUsd, volumeUsd }] }` |
| `GET` | `/users/:wallet/created` | Launches whose `creator` matches the wallet |
| `GET` | `/users/:wallet/held` | Intersect `mint`/`amount` query params with known EOL mints. Amounts come from the client (`getTokenAccountsByOwner`). |
| `POST` | `/media` | Multipart `file`. PNG/JPEG/WebP/SVG/JSON, max 2MB. Returns `{ id, url }` for Metaplex `uri`. |
| `GET` | `/media/:id` | Stored bytes |
| `POST` | `/webhooks/helius` | Chain ingest. Requires `Authorization` matching `HELIUS_WEBHOOK_SECRET`. |

Wallet address is identity. There is no auth/user table. `profiles` exists in MySQL for optional off-chain prefs keyed by pubkey; no profile HTTP routes in this step.

## Local

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Without `DATABASE_URL` / `REDIS_URL` the process still starts: empty in-memory catalog and in-memory cache. That is for tests and a dry run only.

```bash
pnpm test
pnpm typecheck
```

Point the Launchpad at this API with `NEXT_PUBLIC_API_URL=http://localhost:3001` so logo uploads go to `POST /media`.

## Indexer

The worker is resumable and idempotent. It tracks `indexer_cursor.last_slot` and upserts `launches` / `token_stats` / `price_history`. Replaying the same slot does not duplicate coins or wipe later stats.

Live ingest is `POST /webhooks/helius` (Helius enhanced or raw logs). On boot it catches up from last slot over JSON-RPC `getSignaturesForAddress` for the Factory and EOL programs. Set `SOLANA_WS_URL` to also subscribe to `logsSubscribe`.

`TokenLaunched` is not enough to write a row: name/symbol/status come from the on-chain Factory Launch account (`SOLANA_RPC_URL`). The indexer will not invent a mint that hydration cannot prove.

Point a Helius webhook at `https://<api>/webhooks/helius` with header `Authorization: <HELIUS_WEBHOOK_SECRET>`. Program IDs default to the committed Factory/EOL IDs; override with `FACTORY_PROGRAM_ID` / `EOL_PROGRAM_ID`. Map backing cToken mints with `CSOL_MINT` / `CBTC_MINT`.

## Schema

- `launches` — every launch including VOIDED, plus current stats used for list/sort
- `token_stats` — periodic snapshots (indexer writes these)
- `price_history` — chart series
- `indexer_cursor` — last processed slot
- `profiles` — optional wallet-keyed prefs JSON
