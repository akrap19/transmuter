#!/usr/bin/env bash
# First BPF artefact. platform-tools v1.52 is required (edition2024).
set -euo pipefail
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p target/deploy
cp keys/*-keypair.json target/deploy/ 2>/dev/null || true
cargo-build-sbf --tools-version v1.52 --workspace
# token2022_probe enables mock-dex `cpi` (no-entrypoint). Workspace feature
# unification would otherwise leave mock_dex.so as an empty stub. Rebuild it last.
cargo-build-sbf --tools-version v1.52 -- -p mock-dex
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

