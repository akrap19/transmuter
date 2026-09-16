# Transmuter programs

Anchor workspace for the Transmuter MVP. Implemented: Token-2022 layout
proofs, mock Pyth, mock DEX, keeper stub, cToken (cSOL), Vesting, Runway
Escrow, and Staking. Factory, EOL Token, Registry, and DAO are still
`ping` stubs.

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
| `programs/mock_pyth` | Settable price / conf / publish_time |
| `programs/mock_dex` | Constant-product swap with min_out (SH2) |
| `programs/transmuter_ctoken` | cSOL: NonTransferable mint, `mintForTreasury`, `redeem`, flush |
| `programs/transmuter_vesting` | Two-pot vesting, one TEAM entry, liquidation write-down burn |
| `programs/transmuter_runway_escrow` | USDC runway: fund/draw, halt/resume/advance, liquidation return |
| `programs/transmuter_staking` | Free stake/unstake, snapshotWeight, voter lock |
| `programs/transmuter_*` | Factory, EOL Token, Registry, DAO are still `ping` stubs |
| `crates/transmuter-constants` | Shared numbers (premium 1.25%, 8/10/18 floors) |
| `scripts/keeper.ts` | S9 crank runner (stubs + mock Pyth) |
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
```

`yarn measure-cu` only reprints `reports/finalize-cu.json` from the last test run. It does not need a validator.

`yarn keeper` is a stub. After `anchor test` there is no validator, so it **skips** (exit 0). To actually crank mock Pyth:

```bash
anchor test --skip-lint --detach
yarn keeper
```

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

The CU figure is a **stand-in**: constant-product mock swaps, not Raydium/Orca CLMM.
It proves a BPF artefact exists and that two swap CPIs plus a Token-2022 mint fit
comfortably. Re-measure against the real DEX before treating the
`convertTreasury` split as closed.

`./scripts/build.sh` uses platform-tools v1.52 and writes IDLs for cToken,
the Token-2022 probe, Vesting, Runway Escrow, and Staking.
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

Factory is not built yet. Tests snapshot the payer as factory and register a
wallet-owned treasury ATA. Production Factory will register a PDA-owned treasury.

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
