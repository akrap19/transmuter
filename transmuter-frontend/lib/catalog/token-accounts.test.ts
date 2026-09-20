import { describe, expect, it } from "vitest";
import { tokenBalancesFromParsedAccounts } from "./token-accounts";

describe("tokenBalancesFromParsedAccounts", () => {
  it("keeps positive Token-2022 balances and drops zero or unparsable accounts", () => {
    const balances = tokenBalancesFromParsedAccounts([
      {
        account: {
          data: {
            parsed: {
              info: {
                mint: "MintHeld11111111111111111111111111111111",
                tokenAmount: { uiAmount: 12.5 },
              },
            },
          },
        },
      },
      {
        account: {
          data: {
            parsed: {
              info: {
                mint: "MintZero11111111111111111111111111111111",
                tokenAmount: { uiAmount: 0 },
              },
            },
          },
        },
      },
      { account: { data: { parsed: { info: { mint: "bad" } } } } },
    ]);

    expect(balances).toEqual([{ mint: "MintHeld11111111111111111111111111111111", amount: 12.5 }]);
  });
});
