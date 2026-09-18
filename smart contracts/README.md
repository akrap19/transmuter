# Transmuter programs

Anchor workspace for the Transmuter MVP. Implemented: Token-2022 layout
proofs, Pyth-shaped oracle (mock_pyth `set_price` plus PriceUpdateV2
decode), pinned mock DEX venue, keeper + full lifecycle script, cToken
(cSOL), Vesting, Runway Escrow, Staking, EOL Token (USDC sale, finalize
gates, convertTreasury, reserve mint, liquidation), and Factory
(CREATED → WIRED → SALE). Registry and DAO are shims
(`exists = true`, `quorumMet = false`; streaming-decodable Registry
config prefix).

There is **no gold mint**. Spec pack section 0.2b.

Plan step numbers (`Phase 0`, `Phase 3`, …) are not crate or file names.

## Toolchain

- Host Rust: stable (1.98+)
- Solana CLI 2.3.x
- Anchor 0.32.1
- **platform-tools v1.52** (required). Solana 2.3's default v1.48 is cargo 1.84 and cannot parse `edition2024` crates.

```bash
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana config set --url localhost
```

## Layout

| Path | Role |
|---|---|
| `programs/token2022_probe` | NonTransferable treasury layout + finalize CU probe |
| `programs/mock_pyth` | Settable price / conf / publish_time (lifecycle still `set_price`s to force Path A) |
| `programs/mock_dex` | Pinned protocol venue: constant-product swap with min_out (SH2) |
| `programs/transmuter_ctoken` | cSOL: NonTransferable mint, `mintForTreasury`, `redeem`, flush |
| `programs/transmuter_vesting` | Two-pot vesting, one TEAM entry, liquidation write-down burn |
| `programs/transmuter_runway_escrow` | USDC runway: fund/draw, halt/resume/advance, liquidation return |
| `programs/transmuter_staking` | Free stake/unstake, snapshotWeight, voter lock |
| `programs/transmuter_eol_token` | USDC sale, finalize gates (8/10/18), convertTreasury, fees, reserve mint A+B, liquidation |
| `programs/transmuter_factory` | Launchpad Factory: snapshotted validations, CREATED → WIRED → SALE, registry with creator |
| `programs/transmuter_registry` | Ambassador Registry shim: empty council, streaming config prefix |
| `programs/transmuter_dao` | DAO shim: community vote exists, quorum not met |
| `crates/transmuter-constants` | Shared numbers (premium 1.25%, 8/10/18 floors, oracle bounds, pinned program ids) |
| `crates/transmuter-oracle` | Decodes Pyth `PriceUpdateV2` and mock_pyth `PriceFeed`; stale / wide-conf are errors |
| `scripts/keeper.ts` | S9 crank runner (mock Pyth `set_price`) |
| `scripts/lifecycle.ts` | Full path: launch → sale → finalize → convert → fees → oracle snapshot → reserve mint → vote → liquidation → redeem |
| `scripts/build.sh` | `cargo-build-sbf --tools-version v1.52` |
| `tests/` | Layout proofs, mocks, cToken |
| `reports/finalize-cu.json` | Written by the CU test |
| `keys/` | Program keypairs (IDs pinned in `Anchor.toml`) |

cToken mint layout: Token-2022 with NonTransferable, mint size **exactly 170
bytes** (`getMintLen([NonTransferable])`), mint authority = PDA
`["mint_authority", mint]`, freeze authority **none**. `token2022_probe`
proves mint/burn from an ATA of that PDA. cToken mints into a registered EOL
treasury (wallet ATA in tests until Factory registers a PDA-owned treasury).

## Commands

```bash
cd "smart contracts"
yarn install
./scripts/build.sh
anchor test --skip-lint --skip-build
yarn measure-cu
yarn keeper
yarn lifecycle
```

`yarn measure-cu` only reprints `reports/finalize-cu.json` from the last test run. It does not need a validator.

`yarn keeper` is a crank. After `anchor test` there is no validator, so it **skips** (exit 0). To actually crank mock Pyth:

```bash
anchor test --skip-lint --detach
yarn keeper
```

`yarn lifecycle` runs the whole launch → redemption path once (the Phase 7 keeper script). Same skip if nothing is listening. `tests/lifecycle.ts` is the same path under `anchor test`.

Public-devnet (programs `mock_pyth`, `mock_dex`, `transmuter_ctoken`, `transmuter_eol_token` already deployed; wallet needs a few SOL):

```bash
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET="$HOME/.config/solana/id.json" \
yarn lifecycle
```

The script still `set_price`s mock_pyth to force reserve-mint Path A. On
public-devnet it first snapshots a Pyth `PriceUpdateV2` (Hermes post when
`HERMES_URL` / `HERMES_API_KEY` work; otherwise mock_pyth `write_v2` layout)
and runs `convertTreasury` through Raydium CPMM (`CPMDWBw…`) USDC→WSOL.
New-token EOL/USDC and EOL/WSOL LP is seeded on Raydium CPMM on public-devnet
(`seed_raydium_lp` after finalize; an empty `lp_signer` PDA pays Raydium's
create-pool SOL fee). Localnet still uses the pinned mock DEX.
Optional `SOLANA_RPC_URL` overrides the HTTP endpoint.

## Token-2022 layout results (localnet)

Spec pack also asks for a later **devnet** confirmation of the same PDA layout.
These results are localnet Token-2022, not that venue.

| Proof | Result |
|---|---|
| `MintTo` into PDA-owned treasury | pass |
| `Burn` from PDA-owned treasury | pass |
| Transfer of cToken-shaped mint | fails at **Token-2022** (`TokenzQd…`), PDA is the signer so this is not a missing-signature miss |
| `TransferFeeConfig` on that mint | fails at Token-2022 |
| `probe_finalize_compute` (2 swaps + mint) | **64,500 CU** of 1,400,000 (headroom 1,335,500); 14 accounts of 64 |

The CU figure is a **stand-in**: constant-product swaps on the pinned mock
DEX venue, not Raydium/Orca CLMM. New EOL token mints have no existing CLMM
book; the protocol venue is `mock_dex` (program id pinned in
`transmuter-constants` and typed as `Program<MockDex>` on finalize /
convertTreasury). Re-measure if that venue is swapped for Raydium CPMM.

Oracle reads accept Pyth pull `PriceUpdateV2` (owner =
`rec5EKMGg6MxZWaMbitBFZouL8cRSrkNRK57yRpBEVV`) or mock_pyth. Stale (>120s)
and wide-confidence (>500 bps) prints revert so reserve-mint clocks do not
advance. The lifecycle script still `set_price`s the mock feed to force
Path A, as the spec pack requires.

`./scripts/build.sh` uses platform-tools v1.52 and writes IDLs for cToken,
the Token-2022 probe, Vesting, Runway Escrow, Staking, mock Pyth, mock DEX, EOL Token,
Factory, Registry, and DAO.
`anchor test --skip-lint --skip-build` then runs against that artefact (a plain
`anchor test` may rebuild with v1.48 and fail).

## cToken (cSOL)

Mint premium is the founder 1.25% (1.00% underlying bare-SOL deposit + 0.25%
protocol). Legs must sum exactly or `initialize` reverts. No gold, no age
buckets, no transfer fee, no cToken EOL.

| Instruction | Role |
|---|---|
| `initialize` | Token-2022 NonTransferable mint (size 170, freeze none), snapshot factory + protocol wallet |
| `register_eol` | Factory-only; binds an EOL id to `{authority, ctoken_treasury}` |
| `mint_for_treasury` | Registered EOL only, into its own treasury; quantity-priced; dust reverts |
| `redeem` | Fee-free, never closes the mint; backing-per-token does not fall |
| `flush_protocol_revenue` | Permissionless; revenue pot → `protocolRevenueWallet`, never the reserve |

Worked genesis: deposit `1_012_500_000` lamports → mint `1_000_000_000` cSOL;
reserve backing `1_010_000_000`; protocol revenue `2_500_000`.

Factory registers a PDA-owned treasury: tests snapshot the Factory config PDA
as cToken `factory` and `register_eol` is signed by that PDA.

## Vesting, Runway Escrow, Staking

Vesting holds two token pots (team + investor). Initialization requires a
non-zero TEAM allocation; a second TEAM push reverts. `notifyLiquidation`
burns unvested TEAM from the team pot and rewrites that entry's allocation;
a repeat call is a no-op. Tests still exercise a synthetic INVESTOR entry
and a third OTHER kind so the burn is proven as `kind == TEAM`.

Runway Escrow holds USDC. Governance may halt, resume, or advance; it never
moves the money. `notifyLiquidation` is the only non-draw outflow (to the
EOL treasury). There is no `returnToTreasury`. Config PDA is
`["config", eol_token, usdc_mint]` so launches can share a USDC mint.

Staking is free both ways (`fee_bps = 0`). Unstake returns only to the
staker's own token account. `snapshotWeight` records weight and
`total_staked_at_open`. After `notifyLiquidation`, stake is off and unstake
stays on.

## EOL Token

USDC sale, then finalize. All go/no-go gates (Raise, Escrow, LP, Treasury
accept **8%**, Combined **18%**) run **before any funds move**. The **10%**
figure is the launchpad ask, not an on-chain kill. Unsold sale tokens and
unpaired LP burn; LP scales with subscription `f` at the sale price.

`convertTreasury` is a separate permissionless crank (resumable, idempotent;
a failed swap retries). Every backing read counts cSOL + unconverted USDC +
SOL residue. Escrow remainder at liquidation is a second USDC redemption
leg. Reserve-mint Path B uses the creator-set `governed_mint_pct_bps`.
Liquidation fee is 2% split 1.75% cToken primary / 0.25% protocol;
redemption fees go to zero at execute. `snapshot_oracle` is the S9 price
crank: it stores a Pyth / mock_pyth print and, when ACTIVE, arms Path A
from that price.

## Factory

Guarded launch sequence (S10): **CREATED → WIRED → SALE**. Validations 1–19
run at `create_launch` against **snapshotted** `g`/`L` (mint premium and SH2
slippage), never live governance values. MVP sale type is **FIXED** only.
Every launch nominates cSOL as backing and a mock cBTC as fallback (validation
1b). Wiring steps are individual bits, permissionless to resume; SALE is
unreachable until the mask is complete (vaults last, so a half-wired launch
cannot take a deposit). The registry stores `creator` and copies ACTIVE/VOIDED
from the EOL token via `sync_outcome`.

## Registry + DAO shims

Stand-ins so liquidation and governed reserve-mint can read a result instead
of treating a missing body as consent. Swapping in the real programs later is
a pointer change; consumers stream-decode the Registry config prefix and
ignore trailing bytes.

| Instruction | Role |
|---|---|
| Registry `initialize` | Writes `RegistryConfig` prefix (team, founders, founderThreshold, daoProgram, ambassadorCount=0, maxAmbassadors, genesisLocked) plus shim-only suffix |
| Registry `isAmbassador` / `getAmbassadorCount` / `getAllAmbassadors` | Always false / 0 / empty. Zero count means quorum not met; never divide by it |
| Registry `openCouncilLiquidationVote` / `getCouncilLiquidationResult` | `windowEnd` must be a future unix timestamp; result is `exists=true`, `quorumMet=false` |
| DAO `initialize` | Config PDA `["config"]` |
| DAO `openCommunityVote` | Frozen signature `(proposalId, voteType, windowEnd)`; binary types only (`VOTE_LIQ_DAO` and siblings). `windowEnd` is an absolute timestamp |
| DAO `getCommunityVoteResult` | Same shape as the council read: `exists=true`, `quorumMet=false`, `passed=false` |


