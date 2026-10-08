import { resolveCtokens, type CtokenEnv } from "@/lib/launchpad/ctokens";
import { detailFromApi } from "./load-catalog";
import { liveStatus } from "./live-sale";
import type { CoinDetail, CoinSocials } from "./types";

export type ChainLaunchIdentity = {
  mint: string;
  name: string;
  symbol: string;
  creator: string;
  backingMint: string;
  status: number;
  launchedAt: number;
  metadataUri: string;
};

export type ChainMetadata = {
  logoUrl: string | null;
  description: string;
  socials: CoinSocials;
};

const EMPTY_SOCIALS: CoinSocials = {
  website: null,
  twitter: null,
  telegram: null,
  discord: null,
};

export const EMPTY_CHAIN_METADATA: ChainMetadata = {
  logoUrl: null,
  description: "",
  socials: EMPTY_SOCIALS,
};

export function ctokenLabels(env?: CtokenEnv): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const token of resolveCtokens(env)) {
    if (token.mint) labels[token.mint] = token.name;
  }
  return labels;
}

export function parseChainMetadata(body: unknown): ChainMetadata {
  if (!body || typeof body !== "object") return EMPTY_CHAIN_METADATA;
  const meta = body as Record<string, unknown>;
  const ext = meta.extensions && typeof meta.extensions === "object" ? (meta.extensions as Record<string, unknown>) : {};
  return {
    logoUrl: textOrNull(meta.image),
    description: textOrNull(meta.description) ?? "",
    socials: {
      website: textOrNull(meta.external_url),
      twitter: textOrNull(ext.twitter),
      telegram: textOrNull(ext.telegram),
      discord: textOrNull(ext.discord),
    },
  };
}

/** Build a coin page from the Factory launch account when the index has not caught up. */
export function detailFromChainLaunch(
  launch: ChainLaunchIdentity,
  meta: ChainMetadata,
  labels: Record<string, string> = {},
): CoinDetail | null {
  const status = liveStatus(launch.status, null);
  const name = launch.name.trim();
  const symbol = launch.symbol.trim();
  if (!status || !name || !symbol) return null;
  const launchedAt = Number.isFinite(launch.launchedAt) ? launch.launchedAt : 0;
  return detailFromApi(
    {
      mint: launch.mint,
      name,
      symbol,
      creator: launch.creator,
      backing: labels[launch.backingMint] ?? launch.backingMint,
      status,
      priceUsd: null,
      marketCapUsd: null,
      backingRatioBps: null,
      saleProgressBps: null,
      holderCount: 0,
      launchedAt,
      logoUrl: meta.logoUrl,
      metadataUri: launch.metadataUri.trim() || null,
      description: meta.description,
      socials: meta.socials,
      chart: [],
    },
    [],
  );
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
