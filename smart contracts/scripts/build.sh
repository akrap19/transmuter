#!/usr/bin/env bash
# First BPF artefact. platform-tools v1.52 is required (edition2024).
set -euo pipefail
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p target/deploy
cp keys/*-keypair.json target/deploy/ 2>/dev/null || true
cargo-build-sbf --tools-version v1.52 --workspace
# CPI features on dependents compile these as no-entrypoint. Rebuild the
# deployable artefacts last so .so files are not empty stubs.
for crate in mock-pyth mock-dex transmuter-ctoken transmuter-vesting transmuter-runway-escrow transmuter-staking transmuter-eol-token transmuter-registry transmuter-dao; do
  cargo-build-sbf --tools-version v1.52 -- -p "$crate"
done
# cargo-build-sbf does not emit IDLs. Write them so
# `anchor test --skip-lint --skip-build` can run against this artefact.
anchor idl build -p transmuter_ctoken --skip-lint \
  -o target/idl/transmuter_ctoken.json \
  -t target/types/transmuter_ctoken.ts
anchor idl build -p token2022_probe --skip-lint \
  -o target/idl/token2022_probe.json \
  -t target/types/token2022_probe.ts
anchor idl build -p transmuter_vesting --skip-lint \
  -o target/idl/transmuter_vesting.json \
  -t target/types/transmuter_vesting.ts
anchor idl build -p transmuter_runway_escrow --skip-lint \
  -o target/idl/transmuter_runway_escrow.json \
  -t target/types/transmuter_runway_escrow.ts
anchor idl build -p transmuter_staking --skip-lint \
  -o target/idl/transmuter_staking.json \
  -t target/types/transmuter_staking.ts
anchor idl build -p mock_pyth --skip-lint \
  -o target/idl/mock_pyth.json \
  -t target/types/mock_pyth.ts
anchor idl build -p mock_dex --skip-lint \
  -o target/idl/mock_dex.json \
  -t target/types/mock_dex.ts
anchor idl build -p transmuter_eol_token --skip-lint \
  -o target/idl/transmuter_eol_token.json \
  -t target/types/transmuter_eol_token.ts
anchor idl build -p transmuter_factory --skip-lint \
  -o target/idl/transmuter_factory.json \
  -t target/types/transmuter_factory.ts
anchor idl build -p transmuter_registry --skip-lint \
  -o target/idl/transmuter_registry.json \
  -t target/types/transmuter_registry.ts
anchor idl build -p transmuter_dao --skip-lint \
  -o target/idl/transmuter_dao.json \
  -t target/types/transmuter_dao.ts

