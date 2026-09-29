import { Connection, PublicKey } from "@solana/web3.js";
import { createReadonlyProvider, createTransmuterClient } from "@/lib/solana/anchor-client";
import { solanaEndpoint } from "@/lib/solana/config";
import type { LiveSaleView } from "./live-sale";
import { readLiveSale, type LiveSaleReaders } from "./read-live-sale";

export async function readServerLiveSale(mint: string, depositor: string | null = null): Promise<LiveSaleView | null> {
  let mintKey: PublicKey;
  let depositorKey: PublicKey | null = null;
  try {
    mintKey = new PublicKey(mint);
    if (depositor) depositorKey = new PublicKey(depositor);
  } catch {
    return null;
  }

  const connection = new Connection(solanaEndpoint, "confirmed");
  const client = createTransmuterClient(createReadonlyProvider(connection, depositorKey ?? PublicKey.default));
  return readLiveSale(readersFrom(client), mintKey, depositorKey, Math.floor(Date.now() / 1000));
}

export function readersFrom(client: ReturnType<typeof createTransmuterClient>): LiveSaleReaders {
  return {
    launch: client.factory.account.launch,
    mintIndex: client.factory.account.mintIndex,
    config: client.eolToken.account.config,
    deposit: client.eolToken.account.deposit,
  };
}
