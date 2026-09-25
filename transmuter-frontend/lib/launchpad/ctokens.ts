import type { CToken } from "./types";

export type CtokenEnv = Record<string, string | undefined>;

function readProcessEnv(): CtokenEnv {
  return {
    NEXT_PUBLIC_CSOL_MINT: process.env.NEXT_PUBLIC_CSOL_MINT,
    NEXT_PUBLIC_CBTC_MINT: process.env.NEXT_PUBLIC_CBTC_MINT,
  };
}

export function resolveCtokens(env: CtokenEnv = readProcessEnv()): CToken[] {
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
