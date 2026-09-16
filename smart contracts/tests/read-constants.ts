import * as fs from "fs";
import * as path from "path";

/** Founder rulings (AGENTS.md). Independent of the Rust crate so a 1.85% slip fails. */
export const FOUNDER = {
  MINT_PREMIUM_RATE_BPS: 125,
  UNDERLYING_PREMIUM_RATE_BPS: 100,
  PROTOCOL_PREMIUM_RATE_BPS: 25,
  TREASURY_MIN_PCT: 10,
  TREASURY_ACCEPT_PCT: 8,
  COMBINED_BACKING_MIN_PCT: 18,
  MAX_COMPUTE_UNITS: 1_400_000,
  NON_TRANSFERABLE_MINT_SPACE: 170,
} as const;

const CONSTANTS_RS = path.join(
  __dirname,
  "..",
  "crates",
  "transmuter-constants",
  "src",
  "lib.rs",
);

function rustU64(src: string, name: string): number {
  const m = src.match(new RegExp(`pub const ${name}: \\w+ = ([0-9_]+);`));
  if (!m) {
    throw new Error(`missing ${name} in transmuter-constants`);
  }
  return Number(m[1].replace(/_/g, ""));
}

export function readRustConstants() {
  const src = fs.readFileSync(CONSTANTS_RS, "utf8");
  return {
    MINT_PREMIUM_RATE_BPS: rustU64(src, "MINT_PREMIUM_RATE_BPS"),
    UNDERLYING_PREMIUM_RATE_BPS: rustU64(src, "UNDERLYING_PREMIUM_RATE_BPS"),
    PROTOCOL_PREMIUM_RATE_BPS: rustU64(src, "PROTOCOL_PREMIUM_RATE_BPS"),
    TREASURY_MIN_PCT: rustU64(src, "TREASURY_MIN_PCT"),
    TREASURY_ACCEPT_PCT: rustU64(src, "TREASURY_ACCEPT_PCT"),
    COMBINED_BACKING_MIN_PCT: rustU64(src, "COMBINED_BACKING_MIN_PCT"),
    MAX_COMPUTE_UNITS: rustU64(src, "MAX_COMPUTE_UNITS"),
    NON_TRANSFERABLE_MINT_SPACE: rustU64(src, "NON_TRANSFERABLE_MINT_SPACE"),
  };
}
