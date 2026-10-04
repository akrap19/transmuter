import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, Transaction, TransactionInstruction } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { ChainTransactionError } from "@/lib/solana/tx";
import type { PreparedWireStep } from "./wire-accounts";
import { buildWireUnits, submitWireBatch, submitWireStep } from "./submit-wire";
import { planWireBatches } from "./wire-batches";

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

function mockInstruction(): TransactionInstruction {
  return new TransactionInstruction({ programId: Keypair.generate().publicKey, keys: [], data: Buffer.alloc(8) });
}

describe("buildWireUnits", () => {
  it("compiles factory steps via instruction() and keeps their extra signers", async () => {
    const eolIx = mockInstruction();
    const instruction = vi.fn().mockResolvedValue(eolIx);
    const wireEol = vi.fn().mockReturnValue({ accounts: () => ({ instruction }) });

    const units = await buildWireUnits([factoryStep("wireEol", [mint])], { methods: { wireEol } });

    expect(instruction).toHaveBeenCalledOnce();
    expect(units).toEqual([{ id: "eol", instructions: [eolIx], signers: [mint] }]);
  });

  it("compiles the treasury ATA step without touching the factory", async () => {
    const ata = Keypair.generate().publicKey;
    const owner = Keypair.generate().publicKey;
    const backing = Keypair.generate().publicKey;

    const units = await buildWireUnits(
      [{ id: "treasuryAta", kind: "ata", signers: [], accounts: { payer: cranker, ata, owner, mint: backing } }],
      { methods: {} },
    );

    expect(units[0].id).toBe("treasuryAta");
    expect(units[0].instructions[0].keys.map((key) => key.pubkey.toBase58())).toContain(ata.toBase58());
  });
});

describe("submitWireBatch", () => {
  it("sends one transaction with a compute budget, every step instruction, and all signers", async () => {
    const vault = Keypair.generate();
    const units = [
      { id: "eol" as const, instructions: [mockInstruction()], signers: [mint] },
      { id: "staking" as const, instructions: [mockInstruction()], signers: [vault] },
    ];
    const [batch] = planWireBatches(units, cranker);
    const send = vi.fn().mockResolvedValue({ signature: "batch-sig", explorerUrl: "https://x/tx/batch-sig" });

    const result = await submitWireBatch({
      batch,
      feePayer: cranker,
      connection: {} as never,
      signer: { publicKey: cranker, signTransaction: async (tx) => tx },
      send,
    });

    const transaction = send.mock.calls[0][0].transaction as Transaction;
    // compute budget + eol ix + staking ix.
    expect(transaction.instructions).toHaveLength(3);
    expect(send.mock.calls[0][0].signers).toEqual([mint, vault]);
    expect(result.signature).toBe("batch-sig");
  });

  it("wraps an unexpected failure in a ChainTransactionError", async () => {
    const [batch] = planWireBatches([{ id: "dao", instructions: [mockInstruction()], signers: [] }], cranker);

    await expect(
      submitWireBatch({
        batch,
        feePayer: cranker,
        connection: {} as never,
        signer: { publicKey: cranker, signTransaction: async (tx) => tx },
        send: vi.fn().mockRejectedValue(new Error("boom")),
      }),
    ).rejects.toMatchObject({ name: "ChainTransactionError", message: "boom" });
  });
});
