/**
 * Permissionless crank runner (spec S9).
 *
 * Talks to the mock Pyth feed and prints the jobs later programs
 * will actually crank (settle, oracle snapshots, reserve-mint trigger,
 * convertTreasury, executeLiquidation).
 *
 * Defaults to localnet. `anchor test` tears the validator down unless you
 * pass `--detach`. No feed account is a skip, not a crash.
 *
 *   yarn keeper
 *   ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=~/.config/solana/id.json yarn keeper
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

const DEFAULT_RPC = "http://127.0.0.1:8899";
const DEFAULT_WALLET = path.join(os.homedir(), ".config", "solana", "id.json");

const JOBS = [
  "settle",
  "oracle_snapshot",
  "reserve_mint_trigger",
  "convert_treasury",
  "execute_liquidation",
] as const;

function ensureProviderEnv(): void {
  if (!process.env.ANCHOR_PROVIDER_URL) {
    process.env.ANCHOR_PROVIDER_URL = DEFAULT_RPC;
  }
  if (!process.env.ANCHOR_WALLET) {
    process.env.ANCHOR_WALLET = DEFAULT_WALLET;
  }
  const wallet = process.env.ANCHOR_WALLET;
  const resolved = wallet.startsWith("~")
    ? path.join(os.homedir(), wallet.slice(1))
    : wallet;
  process.env.ANCHOR_WALLET = resolved;
  if (!fs.existsSync(resolved)) {
    throw new Error(
      `ANCHOR_WALLET not found at ${resolved}. Create a local id.json or set ANCHOR_WALLET.`,
    );
  }
}

async function main() {
  try {
    ensureProviderEnv();
  } catch (err) {
    console.log(err instanceof Error ? err.message : err);
    return;
  }

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  try {
    await provider.connection.getLatestBlockhash("processed");
  } catch {
    console.log(
      `skip: no localnet at ${provider.connection.rpcEndpoint} (anchor test tears it down unless --detach)`,
    );
    return;
  }

  const pyth = (anchor.workspace as Record<string, Program | undefined>).MockPyth
    ?? (anchor.workspace as Record<string, Program | undefined>).mockPyth;

  console.log("transmuter keeper");
  console.log("rpc:", provider.connection.rpcEndpoint);
  console.log("wallet:", provider.wallet.publicKey.toBase58());
  console.log("jobs (stubs until implemented):", JOBS.join(", "));

  if (!pyth) {
    console.log("mock_pyth IDL not in workspace; skip set_price crank");
    return;
  }

  const owner = process.env.PYTH_OWNER
    ? new PublicKey(process.env.PYTH_OWNER)
    : provider.wallet.publicKey;
  const [feed] = PublicKey.findProgramAddressSync(
    [Buffer.from("price_feed"), owner.toBuffer()],
    pyth.programId,
  );

  const info = await provider.connection.getAccountInfo(feed);
  if (!info) {
    console.log("no price feed at", feed.toBase58(), "- initialize mock_pyth first");
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  await pyth.methods
    .setPrice(new anchor.BN(150_000_000), new anchor.BN(50_000), new anchor.BN(now))
    .accounts({ priceFeed: feed, owner })
    .rpc();
  console.log("cranked mock_pyth set_price @", feed.toBase58());
}

main().catch((err) => {
  console.log(err instanceof Error ? err.message : err);
});
