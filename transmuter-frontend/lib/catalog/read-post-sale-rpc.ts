import { Connection, PublicKey } from "@solana/web3.js";
import { createReadonlyProvider, createTransmuterClient, type TransmuterClient } from "@/lib/solana/anchor-client";
import { decodeMintSupply, decodeTokenAmount, getBatchedConnection } from "@/lib/solana/batch-connection";
import { solanaEndpoint } from "@/lib/solana/config";
import { solanaConnectionConfig } from "@/lib/solana/rpc-fetch";
import { fetchHolderCount } from "./holders";
import { readPostSale, type PostSaleReaders } from "./read-post-sale";

type Rpc = Pick<Connection, "getAccountInfo" | "getProgramAccounts" | "getTokenLargestAccounts" | "getMultipleAccountsInfo">;

export function postSaleReaders(client: TransmuterClient, connection: Rpc): PostSaleReaders {
  return {
    config: client.eolToken.account.config,
    launch: client.factory.account.launch,
    mintIndex: client.factory.account.mintIndex,
    deposit: client.eolToken.account.deposit,
    escrow: client.runwayEscrow.account.escrowConfig,
    accountData: async (address) => {
      const info = await connection.getAccountInfo(address, "confirmed");
      return info ? new Uint8Array(info.data) : null;
    },
    tokenAmount: async (address) => decodeTokenAmount(await connection.getAccountInfo(address, "confirmed")),
    lamports: async (address) => {
      const info = await connection.getAccountInfo(address, "confirmed");
      return info ? BigInt(info.lamports) : BigInt(0);
    },
    mintSupply: async (address) => decodeMintSupply(await connection.getAccountInfo(address, "confirmed")),
    holders: (config, mint, vaults) => fetchHolderCount(connection, config, mint, vaults),
  };
}

/** Treasury figures for the first paint. The holder scan is not part of this read. */
export async function readServerBacking(mint: string) {
  let mintKey: PublicKey;
  try {
    mintKey = new PublicKey(mint);
  } catch {
    return null;
  }

  const connection = getBatchedConnection(new Connection(solanaEndpoint, solanaConnectionConfig));
  const client = createTransmuterClient(createReadonlyProvider(connection));
  const readers = postSaleReaders(client, connection);
  readers.holders = undefined;
  const view = await readPostSale(readers, mintKey, null, Math.floor(Date.now() / 1000));
  if (!view) return null;
  return {
    treasury: view.treasury,
    backingRatioBps: view.backingRatioBps,
    priceUsd: view.priceUsd,
    marketCapUsd: view.marketCapUsd,
  };
}
