import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { countHolders, decodeDeposit } from "./holders";

const BUYER = "7r9CHkGP8C2d3c58o12355othUh42rqR92uXQNCR62Si";
const OTHER = "8JW9T5Jdd6HS3NKKf1JuWhZQBzrSn8TN6EbuaiNgbbb3";

describe("countHolders", () => {
  it("counts an unclaimed buyer even when the tokens are still in the sale vault", () => {
    expect(
      countHolders({
        deposits: [{ depositor: BUYER, amount: BigInt(3_999_940), claimed: false }],
        tokenAccounts: [],
        tokenAccountsKnown: true,
      }),
    ).toBe(1);
  });

  it("counts a claimed buyer from their token account once, and drops a full withdrawal", () => {
    expect(
      countHolders({
        deposits: [
          { depositor: BUYER, amount: BigInt(3_999_940), claimed: true },
          { depositor: OTHER, amount: BigInt(0), claimed: false },
        ],
        tokenAccounts: [{ owner: BUYER, amount: BigInt(1_000) }],
        tokenAccountsKnown: true,
      }),
    ).toBe(1);
  });

  it("keeps claimed buyers when token accounts could not be listed", () => {
    expect(
      countHolders({
        deposits: [{ depositor: BUYER, amount: BigInt(1), claimed: true }],
        tokenAccounts: [],
        tokenAccountsKnown: false,
      }),
    ).toBe(1);
  });
});

describe("decodeDeposit", () => {
  it("reads the depositor, credit, and claimed flag", () => {
    const data = new Uint8Array(82);
    data.set(new PublicKey(BUYER).toBytes(), 40);
    new DataView(data.buffer).setBigUint64(72, BigInt(3_999_940), true);
    data[80] = 1;

    expect(decodeDeposit(data)).toEqual({
      depositor: BUYER,
      amount: BigInt(3_999_940),
      claimed: true,
    });
    expect(decodeDeposit(data.subarray(0, 10))).toBeNull();
  });
});
