# Transmuter

Launchpad and end-of-life infrastructure on Solana.

Tokens launched here start with a funded reserve. If the project dies, holders vote, the protocol liquidates, and everyone redeems their share. The floor is a balance, not a promise.

A project raises USDC in a fixed-price sale. At finalize, proceeds seed two liquidity pools, fund a team runway escrow, and convert the rest into **cSOL** — a NonTransferable Token-2022 wrapper around SOL that only project treasuries hold. The launched token then trades; fees feed the reserve. If holders vote to liquidate, the treasury is unwound and paid out pro-rata.

## Status

Hackathon build in progress. On-chain work is localnet; the Launchpad UI is not wired to programs yet.

| Piece | State |
|---|---|
| Token-2022 layout proofs, mock Pyth, mock DEX, keeper stub | Done (localnet) |
| cSOL, Vesting, Runway Escrow, Staking | Done |
| Factory, EOL Token, Registry, DAO | `ping` stubs |
| Launchpad UI (wizard, docs, wallet connect) | Built, not on-chain |
| Indexer / API | Not started |

There is no gold mint in this build.

## Repo

```
smart contracts/          Anchor 0.32.1 programs, tests, keeper
transmuter-frontend/      Next.js 16 Launchpad
backend/                  planned Node.js + MySQL indexer (rules only)
```

Program details, CU proofs, and instruction tables live in [`smart contracts/README.md`](smart%20contracts/README.md).

## Quick start

### Launchpad UI

```bash
cd transmuter-frontend
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Launch wizard is at `/launchpad`.

### Programs (localnet)

Needs Rust stable (1.98+), Solana CLI 2.3.x, Anchor 0.32.1, and **platform-tools v1.52**. A plain `anchor build` may pick v1.48 and fail.

```bash
cd "smart contracts"
yarn install
./scripts/build.sh
anchor test --skip-lint --skip-build
```

## How a launch works

1. **Sale** — deposit USDC; withdraw in full until close. If the raise cannot fund the reserve floors, the launch voids and every deposit returns whole.
2. **Finalize** — seed EOL/USDC and EOL/SOL pools, fund runway escrow, convert remaining USDC → SOL → cSOL treasury.
3. **Trade** — transfer fees accrue on-chain; a permissionless keeper settles them.
4. **End of life** — holders vote to liquidate. Unvested team tokens burn. Remaining backing pays out pro-rata.

UI treasury ask is **10%**. On-chain accept floor is **8%**. Combined backing floor (treasury + LP) is **18%**. cSOL mint premium is **1.25%** (1.00% into the reserve + 0.25% protocol).

cSOL cannot be transferred. Treasuries mint and burn it through a PDA; wallets never hold it.

## Stack

Rust, Anchor 0.32, Token-2022, SPL Token, Pyth, Raydium/Orca CLMM, Jupiter, Metaplex Token Metadata, TypeScript, Next.js 16, React 19, Tailwind CSS, shadcn/ui, Solana Wallet Adapter, Node.js, Fastify, MySQL, Redis, Helius, Cursor, Grok, Solana CLI, cargo-build-sbf, Mocha/Chai.

Localnet swaps and oracles are mocks. Production paths are Pyth plus a pinned CLMM venue, with Jupiter for protocol swaps.

## Docs

- [`Transmuter_System_Logic.md`](Transmuter_System_Logic.md) — what the system is for
- [`Transmuter_MVP_Spec_Pack_r42-MVP1.md`](Transmuter_MVP_Spec_Pack_r42-MVP1.md) — normative spec
- [`smart contracts/README.md`](smart%20contracts/README.md) — programs, toolchain, test results
# transmuter
