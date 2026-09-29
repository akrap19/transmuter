import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { describe, expect, it, vi } from "vitest";
import { ChainTransactionError, type TransactionSigner } from "@/lib/solana/tx";
import { stakePlan } from "./holder-accounts";
import { submitHolder, type HolderClients, type HolderSubmit } from "./submit-holder";

const mint = Keypair.generate().publicKey;
const owner = Keypair.generate().publicKey;
const vault = Keypair.generate().publicKey;
const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const ctokenMint = Keypair.generate().publicKey;
const treasuryUsdc = Keypair.generate().publicKey;

function clients() {
  const built = new Transaction().add({
    keys: [],
    programId: Keypair.generate().publicKey,
    data: Buffer.from([1]),
  });
  const accounts = vi.fn().mockReturnValue({ transaction: vi.fn().mockResolvedValue(built) });
  const stake = vi.fn().mockReturnValue({ accounts });
  const unstake = vi.fn().mockReturnValue({ accounts });
  const claim = vi.fn().mockReturnValue({ accounts });
  const draw = vi.fn().mockReturnValue({ accounts });
  const redeem = vi.fn().mockReturnValue({ accounts });
  const openLiquidationVote = vi.fn().mockReturnValue({ accounts });
  const castLiquidationVote = vi.fn().mockReturnValue({ accounts });
  const executeLiquidation = vi.fn().mockReturnValue({ accounts });
  const programs: HolderClients = {
    staking: { methods: { stake, unstake } },
    vesting: { methods: { claim } },
    escrow: { methods: { draw } },
    eol: { methods: { redeem, openLiquidationVote, castLiquidationVote, executeLiquidation } },
  };
  return { programs, stake, unstake, claim, draw, redeem, openLiquidationVote, castLiquidationVote, executeLiquidation, accounts };
}

const base: HolderSubmit = {
  signer: owner,
  mint,
  decimals: 6,
  stakeVault: vault,
  vesting: null,
  escrow: null,
  ctokenMint,
  treasuryUsdc,
  usdcMint,
  protocolRevenue: owner,
  staking: null,
  vestingSide: null,
  escrowSide: null,
  weight: BigInt(0),
};

describe("submitHolder", () => {
  it("creates the wallet token account and stakes that amount", async () => {
    const { programs, stake, accounts } = clients();
    const send = vi.fn().mockResolvedValue({ signature: "stk", explorerUrl: "https://explorer.solana.com/tx/stk?cluster=devnet" });
    const result = await submitHolder({
      kind: "stake",
      amount: "1.25",
      chain: base,
      programs,
      connection: {} as never,
      signer: { publicKey: owner, signTransaction: async (tx) => tx },
      send,
    });
    const plan = stakePlan({ owner, mint, vault, decimals: 6, amount: "1.25" });
    expect(stake).toHaveBeenCalledTimes(1);
    expect(bnOf(stake.mock.calls[0][0])).toBe("1250000");
    expect(accounts).toHaveBeenCalledWith(plan?.accounts);
    const transaction = send.mock.calls[0][0].transaction as Transaction;
    expect(transaction.instructions[0].keys.map((key) => key.pubkey.toBase58())).toEqual(
      expect.arrayContaining([plan!.source.toBase58(), TOKEN_2022_PROGRAM_ID.toBase58()]),
    );
    expect(result.signature).toBe("stk");
  });

  it("claims vested tokens into a new recipient account", async () => {
    const { programs, claim } = clients();
    const send = vi.fn().mockResolvedValue({ signature: "clm", explorerUrl: "https://explorer.solana.com/tx/clm?cluster=devnet" });
    const vesting = {
      config: Keypair.generate().publicKey,
      entry: Keypair.generate().publicKey,
      pot: Keypair.generate().publicKey,
    };
    await submitHolder({
      kind: "vestingClaim",
      chain: { ...base, vesting },
      programs,
      connection: {} as never,
      signer: { publicKey: owner, signTransaction: async (tx) => tx },
      send,
    });
    expect(claim).toHaveBeenCalledTimes(1);
    const transaction = send.mock.calls[0][0].transaction as Transaction;
    expect(transaction.instructions).toHaveLength(2);
  });

  it("draws escrow USDC into the team USDC account", async () => {
    const { programs, draw } = clients();
    const send = vi.fn().mockResolvedValue({ signature: "drw", explorerUrl: "https://explorer.solana.com/tx/drw?cluster=devnet" });
    await submitHolder({
      kind: "escrowDraw",
      chain: {
        ...base,
        escrow: { config: Keypair.generate().publicKey, vault: Keypair.generate().publicKey },
      },
      programs,
      connection: {} as never,
      signer: { publicKey: owner, signTransaction: async (tx) => tx },
      send,
    });
    expect(draw).toHaveBeenCalledTimes(1);
    const transaction = send.mock.calls[0][0].transaction as Transaction;
    expect(transaction.instructions[0].keys.map((key) => key.pubkey.toBase58())).toEqual(
      expect.arrayContaining([TOKEN_PROGRAM_ID.toBase58(), usdcMint.toBase58()]),
    );
  });

  it("redeems by creating the USDC account before the burn", async () => {
    const { programs, redeem } = clients();
    const send = vi.fn().mockResolvedValue({ signature: "rdm", explorerUrl: "https://explorer.solana.com/tx/rdm?cluster=devnet" });
    await submitHolder({
      kind: "redeem",
      amount: "10",
      chain: base,
      programs,
      connection: {} as never,
      signer: { publicKey: owner, signTransaction: async (tx) => tx },
      send,
    });
    expect(bnOf(redeem.mock.calls[0][0])).toBe("10000000");
    const transaction = send.mock.calls[0][0].transaction as Transaction;
    expect(transaction.instructions.length).toBeGreaterThanOrEqual(2);
  });

  it("opens, casts, and executes a liquidation vote", async () => {
    const { programs, openLiquidationVote, castLiquidationVote, executeLiquidation } = clients();
    const send = vi.fn().mockResolvedValue({ signature: "vote", explorerUrl: "https://explorer.solana.com/tx/vote?cluster=devnet" });
    const signer: TransactionSigner = { publicKey: owner, signTransaction: async (tx) => tx };
    const shared = {
      chain: { ...base, staking: Keypair.generate().publicKey, weight: BigInt(4) },
      programs,
      connection: {} as never,
      signer,
      send,
    };
    await submitHolder({ kind: "openLiquidationVote", ...shared });
    await submitHolder({ kind: "castLiquidationVote", yes: true, ...shared });
    await submitHolder({ kind: "executeLiquidation", ...shared });
    expect(openLiquidationVote).toHaveBeenCalledTimes(1);
    expect(castLiquidationVote).toHaveBeenCalledWith(true, expect.any(BN));
    expect(bnOf(castLiquidationVote.mock.calls[0][1])).toBe("4");
    expect(executeLiquidation).toHaveBeenCalledTimes(1);
  });

  it("rejects a stake amount the mint cannot represent", async () => {
    const { programs } = clients();
    await expect(
      submitHolder({
        kind: "stake",
        amount: "0",
        chain: base,
        programs,
        connection: {} as never,
        signer: { publicKey: owner, signTransaction: async (tx) => tx },
        send: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(ChainTransactionError);
  });
});

function bnOf(value: unknown): string {
  return (value as BN).toString();
}
