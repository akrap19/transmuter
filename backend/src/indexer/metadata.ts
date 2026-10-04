import type { CoinSocials } from "../catalog/types.ts";

export type ResolvedMetadata = {
  logoUrl: string | null;
  description: string;
  socials: CoinSocials;
};

export type JsonFetch = (url: string) => Promise<unknown>;

const EMPTY_SOCIALS: CoinSocials = {
  website: null,
  twitter: null,
  telegram: null,
  discord: null,
};

export const EMPTY_METADATA: ResolvedMetadata = {
  logoUrl: null,
  description: "",
  socials: EMPTY_SOCIALS,
};

export async function defaultFetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`metadata fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Resolve a Launch's on-chain metadata URI into display fields. Reads the
 * Metaplex metadata JSON (`image`, `description`, `external_url`, `extensions`)
 * and maps it to logoUrl + socials. Any failure degrades to empty metadata so
 * indexing never breaks on a bad or unreachable URI.
 */
export async function resolveLaunchMetadata(
  uri: string | null | undefined,
  fetchJson: JsonFetch = defaultFetchJson,
): Promise<ResolvedMetadata> {
  const trimmed = uri?.trim();
  if (!trimmed) return EMPTY_METADATA;
  try {
    const body = await fetchJson(trimmed);
    if (!body || typeof body !== "object") return EMPTY_METADATA;
    const meta = body as Record<string, unknown>;
    const ext =
      meta.extensions && typeof meta.extensions === "object"
        ? (meta.extensions as Record<string, unknown>)
        : {};
    return {
      logoUrl: str(meta.image),
      description: str(meta.description) ?? "",
      socials: {
        website: str(meta.external_url),
        twitter: str(ext.twitter),
        telegram: str(ext.telegram),
        discord: str(ext.discord),
      },
    };
  } catch {
    return EMPTY_METADATA;
  }
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
