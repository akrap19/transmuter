import { describe, expect, it } from "vitest";
import { fallbackCtoken, resolveCtokens } from "./ctokens";

const CSOL = "So11111111111111111111111111111111111111112";
const CBTC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

describe("resolveCtokens", () => {
  it("lists cSOL first as default backing and mock cBTC second, with mint pubkeys from env", () => {
    const tokens = resolveCtokens({
      NEXT_PUBLIC_CSOL_MINT: CSOL,
      NEXT_PUBLIC_CBTC_MINT: CBTC,
    });

    expect(tokens.map((t) => t.name)).toEqual(["cSOL", "cBTC"]);
    expect(tokens[0]).toMatchObject({ name: "cSOL", base: "SOL", icon: "◎", mint: CSOL });
    expect(tokens[1]).toMatchObject({ name: "cBTC", base: "BTC", icon: "₿", mint: CBTC });
  });

  it("returns the other whitelist mint as fallback so backing and fallback always differ", () => {
    const tokens = resolveCtokens({
      NEXT_PUBLIC_CSOL_MINT: CSOL,
      NEXT_PUBLIC_CBTC_MINT: CBTC,
    });

    expect(fallbackCtoken(tokens[0], tokens).mint).toBe(CBTC);
    expect(fallbackCtoken(tokens[1], tokens).mint).toBe(CSOL);
  });
});
