import type { CToken } from "./types";

export type CtokenEnv = Record<string, string | undefined>;

export function resolveCtokens(env: CtokenEnv = process.env): CToken[] {
  return [
    {
      name: "cSOL",
      icon: "◎",
      base: "SOL",
      eol: "Isolated gold reserve",
      mint: env.NEXT_PUBLIC_CSOL_MINT ?? "",
    },
    {
      name: "cBTC",
      icon: "₿",
      base: "BTC",
      eol: "Isolated gold reserve",
      mint: env.NEXT_PUBLIC_CBTC_MINT ?? "",
    },
  ];
}

export function fallbackCtoken(selected: CToken, whitelist: CToken[] = resolveCtokens()): CToken {
  const fallback = whitelist.find((token) => token.name !== selected.name);
  if (!fallback) {
    throw new Error("cToken whitelist must include a fallback mint distinct from backing");
  }
  return fallback;
}
