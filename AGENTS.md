# Transmuter

Launchpad protocol: Solana programs + Next.js frontend. Spec pack is
normative. System Logic explains intent. **If they disagree, the spec pack
wins**, except where a founder ruling in this file or in
`crates/transmuter-constants` overrides the pack.

## Layout

- [`smart contracts/`](smart%20contracts/) — Anchor 0.32.1 workspace (Token-2022 localnet proofs; CU is a mock-DEX stand-in, not convertTreasury)
- [`transmuter-frontend/`](transmuter-frontend/) — Next.js 16 Launchpad UI (not wired on-chain yet)
- [`backend/`](backend/) — **Done:** Fastify read-model API, MySQL schema, media upload, Redis cache, indexer worker (Helius webhook + RPC catch-up, last-slot cursor)


## Founder rulings that override the spec pack

- cToken mint premium is **1.25%** (1.00% underlying bare-SOL deposit + 0.25% protocol), not 1.85%
- UI treasury floor is **10%** (ask). On-chain accept floor is **8%**. Do not collapse them
- Combined backing floor is **18%**
- Governed reserve-mint **% of supply** is set by the creator at launch; Path B only activates it
- Escrow remainder at liquidation: convert to cSOL **or** pay USDC pro-rata — pick one at implementation

## Agent notes

- There is no Solana/Anchor skill on skills.sh. Contract safety is the rules under `smart contracts/.cursor/rules/` plus the spec invariants
- Build BPF with `smart contracts/scripts/build.sh` (platform-tools **v1.52**). Default `anchor build` may use v1.48 and fail
- Verify Token-2022 by running on a validator, not by reading APIs
- Crates, programs, tests, and reports are named for what they are (`token2022_probe`, `ctoken.ts`). Plan step numbers stay in the spec/plan, never in identifiers (`phase0_*`, `phase3_*`)
