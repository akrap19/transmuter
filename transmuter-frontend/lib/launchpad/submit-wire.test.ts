import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, Transaction } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { ChainTransactionError } from "@/lib/solana/tx";
import type { PreparedWireStep } from "./wire-accounts";
import { submitWireStep } from "./submit-wire";

const cranker = Keypair.generate().publicKey;
const mint = Keypair.generate();

function factoryStep(method: PreparedWireStep["method"], signers: Keypair[]): PreparedWireStep {
  return {
    id: "eol",
    kind: "factory",
    method,
    signers,
    accounts: {
      cranker,
      mint: mint.publicKey,
    },
  };
}

describe("submitWireStep", () => {
  it("sends the Factory crank and asks the wallet to co-sign the extra keypairs", async () => {
    const built = new Transaction();
    const accounts = vi.fn().mockReturnValue({ transaction: vi.fn().mockResolvedValue(built) });
    const wireEol = vi.fn().mockReturnValue({ accounts });
    const send = vi.fn().mockResolvedValue({ signature: "sig", explorerUrl: "https://explorer.solana.com/tx/sig?cluster=devnet" });

    const result = await submitWireStep({
      step: factoryStep("wireEol", [mint]),
      factory: { methods: { wireEol } },
      connection: {} as never,
      signer: { publicKey: cranker, signTransaction: async (tx) => tx },
      send,
    });

    expect(wireEol).toHaveBeenCalledOnce();
    expect(accounts).toHaveBeenCalledWith({ cranker, mint: mint.publicKey });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ transaction: built, signers: [mint] }));
    expect(result.signature).toBe("sig");
  });

  it("creates the cToken treasury as an idempotent Token-2022 ATA", async () => {
    const ata = Keypair.generate().publicKey;
    const owner = Keypair.generate().publicKey;
    const backing = Keypair.generate().publicKey;
    const send = vi.fn().mockResolvedValue({ signature: "ata-sig", explorerUrl: "https://explorer.solana.com/tx/ata-sig" });

    await submitWireStep({
      step: {
        id: "treasuryAta",
        kind: "ata",
        signers: [],
        accounts: { payer: cranker, ata, owner, mint: backing },
      },
      factory: { methods: {} },
      connection: {} as never,
      signer: { publicKey: cranker, signTransaction: async (tx) => tx },
      send,
    });

    const transaction = send.mock.calls[0][0].transaction as Transaction;
    const ix = transaction.instructions[0];
    expect(ix.keys.map((key) => key.pubkey.toBase58())).toContain(ata.toBase58());
    expect(ix.keys.map((key) => key.pubkey.toBase58())).toContain(TOKEN_2022_PROGRAM_ID.toBase58());
  });

  it("turns a program rejection into a chain error the checklist can show", async () => {
    const wireStaking = vi.fn().mockReturnValue({
      accounts: () => ({
        transaction: async () => {
          throw { error: { errorMessage: "need EOL wired first", errorCode: { code: "NeedEol" } } };
        },
      }),
    });

    await expect(
      submitWireStep({
        step: factoryStep("wireStaking", []),
        factory: { methods: { wireStaking } },
        connection: {} as never,
        signer: { publicKey: cranker, signTransaction: async (tx) => tx },
        send: vi.fn(),
      }),
    ).rejects.toMatchObject({ name: "ChainTransactionError", message: "need EOL wired first", code: "NeedEol" });
  });

  it("leaves a confirmed ChainTransactionError unchanged", async () => {
    const confirmed = new ChainTransactionError("The wallet does not have enough SOL to pay the fee.", {
      signature: "sig",
      explorerUrl: "https://explorer.solana.com/tx/sig?cluster=devnet",
    });
    const wireDao = vi.fn().mockReturnValue({
      accounts: () => ({ transaction: async () => new Transaction() }),
    });

    await expect(
      submitWireStep({
        step: factoryStep("wireDao", []),
        factory: { methods: { wireDao } },
        connection: {} as never,
        signer: { publicKey: cranker, signTransaction: async (tx) => tx },
        send: vi.fn().mockRejectedValue(confirmed),
      }),
    ).rejects.toBe(confirmed);
  });
});
