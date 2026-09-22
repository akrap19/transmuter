import { describe, expect, it } from "vitest";
import { encodeBase58 } from "./base58.ts";
import { parseHeliusPayload } from "./helius.ts";

function pubkey(seed: number): string {
  const bytes = Buffer.alloc(32, 0);
  bytes[0] = seed;
  return encodeBase58(bytes);
}

describe("parseHeliusPayload", () => {
  it("reads an enhanced transaction webhook array into chain txs", () => {
    const mint = pubkey(2);
    const txs = parseHeliusPayload([
      {
        slot: 99,
        signature: "sig-a",
        timestamp: 1_700_000_050,
        transactionError: null,
        logs: ["Program data: abc"],
        accountData: [{ account: mint, nativeBalanceChange: 0 }],
        tokenTransfers: [{ mint, tokenAmount: 3, fromUserAccount: "a", toUserAccount: "b" }],
        instructions: [{ programId: "factory", accounts: [mint] }],
      },
    ]);

    expect(txs).toEqual([
      {
        slot: 99n,
        signature: "sig-a",
        blockTime: 1_700_000_050,
        logs: ["Program data: abc"],
        accountKeys: [mint],
        tokenTransfers: [{ mint, amount: 3 }],
        err: undefined,
      },
    ]);
  });

  it("keeps failed txs marked so ingest can skip them", () => {
    const txs = parseHeliusPayload({
      transactions: [
        {
          slot: "12",
          signature: "sig-fail",
          err: "InstructionError",
          meta: { logMessages: ["Program log: boom"], err: "InstructionError" },
          transaction: { message: { accountKeys: ["11111111111111111111111111111111"] } },
        },
      ],
    });

    expect(txs[0]?.err).toBeTruthy();
    expect(txs[0]?.logs).toEqual(["Program log: boom"]);
    expect(txs[0]?.slot).toBe(12n);
  });

  it("returns no txs for an empty or unknown payload", () => {
    expect(parseHeliusPayload(null)).toEqual([]);
    expect(parseHeliusPayload({})).toEqual([]);
    expect(parseHeliusPayload("nope")).toEqual([]);
  });
});
