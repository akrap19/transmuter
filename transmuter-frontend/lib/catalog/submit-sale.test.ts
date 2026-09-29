import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { ChainTransactionError } from "@/lib/solana/tx";
import { saleAccounts } from "./sale-accounts";
import { submitSale, type EolSaleClient } from "./submit-sale";

const mint = Keypair.generate().publicKey;
const depositor = Keypair.generate().publicKey;
const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const saleUsdcVault = Keypair.generate().publicKey;

function eolClient(depositAtoms = "250000000") {
  const built = new Transaction().add({
    keys: [],
    programId: Keypair.generate().publicKey,
    data: Buffer.from([1]),
  });
  const accounts = vi.fn().mockReturnValue({ transaction: vi.fn().mockResolvedValue(built) });
  const deposit = vi.fn().mockReturnValue({ accounts });
  const withdraw = vi.fn().mockReturnValue({ accounts });
  const fetchConfig = vi.fn().mockResolvedValue({ saleUsdcVault, usdcMint });
  const fetchDeposit = vi.fn().mockResolvedValue({ amount: { toString: () => depositAtoms } });
  const eol: EolSaleClient = {
    methods: { deposit, withdraw },
    account: {
      config: { fetch: fetchConfig },
      deposit: { fetch: fetchDeposit },
    },
  };
  return { eol, deposit, withdraw, accounts, fetchDeposit };
}

describe("submitSale", () => {
  it("creates the wallet USDC account and deposits that amount into the sale vault", async () => {
    const { eol, deposit, accounts } = eolClient();
    const send = vi.fn().mockResolvedValue({
      signature: "dep",
      explorerUrl: "https://explorer.solana.com/tx/dep?cluster=devnet",
    });

    const result = await submitSale({
      kind: "deposit",
      amount: "1.25",
      mint,
      depositor,
      eol,
      connection: {} as never,
      signer: { publicKey: depositor, signTransaction: async (tx) => tx },
      send,
    });

    const expected = saleAccounts({ mint, depositor, usdcMint, saleUsdcVault });
    expect(deposit).toHaveBeenCalledWith(expect.objectContaining({ toString: expect.any(Function) }));
    expect(deposit.mock.calls[0][0].toString()).toBe("1250000");
    expect(accounts).toHaveBeenCalledWith({
      depositor,
      config: expected.config,
      saleUsdcVault,
      source: expected.userUsdc,
      deposit: expected.deposit,
      usdcProgram: TOKEN_PROGRAM_ID,
      systemProgram: expected.systemProgram,
    });

    const transaction = send.mock.calls[0][0].transaction as Transaction;
    const ata = transaction.instructions[0];
    expect(ata.keys.map((key) => key.pubkey.toBase58())).toEqual(
      expect.arrayContaining([expected.userUsdc.toBase58(), TOKEN_PROGRAM_ID.toBase58(), usdcMint.toBase58()]),
    );
    expect(transaction.instructions).toHaveLength(2);
    expect(result.signature).toBe("dep");
  });

  it("withdraws the full on-chain USDC credit back to the wallet account", async () => {
    const { eol, withdraw, fetchDeposit } = eolClient("4000000");
    const send = vi.fn().mockResolvedValue({
      signature: "wd",
      explorerUrl: "https://explorer.solana.com/tx/wd?cluster=devnet",
    });

    await submitSale({
      kind: "withdraw",
      mint,
      depositor,
      eol,
      connection: {} as never,
      signer: { publicKey: depositor, signTransaction: async (tx) => tx },
      send,
    });

    const expected = saleAccounts({ mint, depositor, usdcMint, saleUsdcVault });
    expect(fetchDeposit).toHaveBeenCalledWith(expected.deposit);
    expect(withdraw.mock.calls[0][0].toString()).toBe("4000000");
    expect(withdraw.mock.results[0].value.accounts).toHaveBeenCalledWith({
      depositor,
      config: expected.config,
      saleUsdcVault,
      destination: expected.userUsdc,
      deposit: expected.deposit,
      usdcProgram: TOKEN_PROGRAM_ID,
    });
  });

  it("turns a program rejection into a chain error", async () => {
    const { eol, deposit } = eolClient();
    deposit.mockReturnValue({
      accounts: () => ({
        transaction: async () => {
          throw { error: { errorMessage: "deposit exceeds remaining sale cap", errorCode: { code: "Cap" } } };
        },
      }),
    });

    await expect(
      submitSale({
        kind: "deposit",
        amount: "10",
        mint,
        depositor,
        eol,
        connection: {} as never,
        signer: { publicKey: depositor, signTransaction: async (tx) => tx },
        send: vi.fn(),
      }),
    ).rejects.toMatchObject({
      name: "ChainTransactionError",
      message: "deposit exceeds remaining sale cap",
      code: "Cap",
    });
  });

  it("refuses a deposit amount that is not a positive USDC value", async () => {
    const { eol, deposit } = eolClient();
    await expect(
      submitSale({
        kind: "deposit",
        amount: "0",
        mint,
        depositor,
        eol,
        connection: {} as never,
        signer: { publicKey: depositor, signTransaction: async (tx) => tx },
        send: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(ChainTransactionError);
    expect(deposit).not.toHaveBeenCalled();
  });
});
