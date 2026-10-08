import { Connection, PublicKey } from "@solana/web3.js";
import { createReadonlyProvider, createTransmuterClient } from "@/lib/solana/anchor-client";
import { solanaEndpoint } from "@/lib/solana/config";
import { readFactoryLaunchByMint } from "@/lib/solana/accounts";
import { solanaConnectionConfig } from "@/lib/solana/rpc-fetch";
import {
  ctokenLabels,
  detailFromChainLaunch,
  EMPTY_CHAIN_METADATA,
  parseChainMetadata,
  type ChainLaunchIdentity,
  type ChainMetadata,
} from "./chain-coin";
import type { CoinDetail } from "./types";

type LaunchAccount = {
  creator: { toBase58(): string };
  backingCtoken: { toBase58(): string };
  status: number;
  timestamp: { toString(): string };
  name: string;
  symbol: string;
  metadataUri: string;
};

export async function readServerChainCoin(mint: string): Promise<CoinDetail | null> {
  let mintKey: PublicKey;
  try {
    mintKey = new PublicKey(mint);
  } catch {
    return null;
  }

  const connection = new Connection(solanaEndpoint, solanaConnectionConfig);
  const client = createTransmuterClient(createReadonlyProvider(connection));
  const row = await readFactoryLaunchByMint(
    { launch: client.factory.account.launch, mintIndex: client.factory.account.mintIndex },
    mintKey,
  );
  if (!row) return null;

  const account = row.account as LaunchAccount;
  const identity: ChainLaunchIdentity = {
    mint,
    name: account.name,
    symbol: account.symbol,
    creator: account.creator.toBase58(),
    backingMint: account.backingCtoken.toBase58(),
    status: Number(account.status),
    launchedAt: Number(account.timestamp.toString()),
    metadataUri: account.metadataUri ?? "",
  };
  const meta = await fetchChainMetadata(identity.metadataUri);
  return detailFromChainLaunch(identity, meta, ctokenLabels());
}

async function fetchChainMetadata(uri: string): Promise<ChainMetadata> {
  const trimmed = uri.trim();
  if (!trimmed) return EMPTY_CHAIN_METADATA;
  try {
    const response = await fetch(trimmed, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!response.ok) return EMPTY_CHAIN_METADATA;
    return parseChainMetadata(await response.json());
  } catch {
    return EMPTY_CHAIN_METADATA;
  }
}
