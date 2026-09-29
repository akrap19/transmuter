import { PublicKey } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { readLiveSale } from "./read-live-sale";

const mint = new PublicKey("So11111111111111111111111111111111111111112");
const depositor = new PublicKey("11111111111111111111111111111111");

function fetcher<T>(account: T | null) {
  return { fetchNullable: vi.fn().mockResolvedValue(account) };
}

describe("readLiveSale", () => {
  it("reads the factory launch, EOL config, and depositor account", async () => {
    const readers = {
      mintIndex: fetcher({ launchId: { toString: () => "4" } }),
      launch: fetcher({ status: 2, targetRaise: BigInt(5_000_000), salePrice: BigInt(100_000), saleEnd: BigInt(1_800_000_000) }),
      config: fetcher({ status: 0, raisedUsdc: BigInt(1_000_000), salePrice: BigInt(250_000), saleEnd: BigInt(1_800_000_000) }),
      deposit: fetcher({ amount: BigInt(500_000) }),
    };

    const live = await readLiveSale(readers, mint, depositor, 1_700_000_000);

    expect(live?.status).toBe("sale");
    expect(live?.sale?.capUsdc).toBe(5);
    expect(live?.sale?.raisedUsdc).toBe(1);
    expect(live?.sale?.priceUsd).toBe(0.25);
    expect(live?.sale?.myDepositUsdc).toBe(0.5);
    expect(readers.deposit.fetchNullable).toHaveBeenCalled();
  });

  it("returns null when the mint is not on chain", async () => {
    const readers = {
      mintIndex: fetcher(null),
      launch: fetcher(null),
      config: fetcher(null),
      deposit: fetcher(null),
    };

    await expect(readLiveSale(readers, mint, null, 1)).resolves.toBeNull();
    expect(readers.deposit.fetchNullable).not.toHaveBeenCalled();
    expect(readers.launch.fetchNullable).not.toHaveBeenCalled();
  });
});
