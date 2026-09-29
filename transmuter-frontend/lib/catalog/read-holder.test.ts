import { Keypair, PublicKey } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { stakingConfigPda } from "@/lib/solana/programs/staking";
import { readHolder, type HolderReaders } from "./read-holder";

const mint = Keypair.generate().publicKey;
const wallet = Keypair.generate().publicKey;
const NOW = 1_700_000_000;
const usdc = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

describe("readHolder", () => {
  it("reads a wired stake, a funded escrow, and a team vesting entry", async () => {
    const view = await readHolder(readers(), mint, wallet, NOW);

    expect(view?.stake).toMatchObject({ staked: 1.5, walletBalance: 4, feeBps: 0, liquidated: false, weight: 1.5 });
    expect(view?.vesting).toMatchObject({ kind: "team", totalAllocation: 100, alreadyClaimed: 10, recipient: wallet.toBase58() });
    expect(view?.escrow).toMatchObject({ fundedPrincipal: 8, alreadyDrawn: 1, status: "active" });
    expect(view?.chain.stakeVault).toBeTruthy();
    expect(view?.chain.vesting?.entry).toBeTruthy();
    expect(view?.daoQuorumMet).toBe(false);
  });

  it("hides escrow until it is funded and hides vesting when the launch has none", async () => {
    const view = await readHolder(readers({ funded: BigInt(0), vesting: PublicKey.default }), mint, wallet, NOW);
    expect(view?.escrow).toBeNull();
    expect(view?.vesting).toBeNull();
    expect(view?.chain.escrow).toBeNull();
  });

  it("opens redemption after finalize and carries unpaid legs", async () => {
    const view = await readHolder(readers({ status: 1 }), mint, wallet, NOW);
    expect(view?.redeem).toMatchObject({
      walletBalance: 4,
      circulatingSupply: 1_000,
      unconvertedUsdc: 3,
      escrowUsdc: 2,
    });
    expect(view?.redeem?.legs).toEqual([
      { asset: "cSOL", owed: 0.5, paid: 0.1 },
      { asset: "USDC", owed: 1, paid: 0 },
    ]);
  });

  it("offers open before the vote and execute after the window, with the DAO shim not meeting quorum", async () => {
    const closed = await readHolder(
      readers({ status: 1, troubleGate: true, voteOpen: false }),
      mint,
      wallet,
      NOW,
    );
    expect(closed?.offers).toEqual({ openVote: true, executeVote: false });
    expect(closed?.votes).toEqual([]);

    const open = await readHolder(
      readers({
        status: 1,
        troubleGate: true,
        voteOpen: true,
        voteClosesAt: BigInt(NOW - 10),
        voteYes: BigInt(6_000_000),
        voteNo: BigInt(1_000_000),
        voteDenom: BigInt(20_000_000),
      }),
      mint,
      wallet,
      NOW,
    );
    expect(open?.offers).toEqual({ openVote: false, executeVote: true });
    expect(open?.votes).toEqual([
      expect.objectContaining({
        kind: "liquidation",
        yesWeight: 6,
        noWeight: 1,
        denom: 20,
        quorumBps: 1_000,
        passBps: 6_700,
      }),
    ]);
    expect(open?.daoQuorumMet).toBe(false);
    expect(open?.chain.weight).toBe(BigInt(1_500_000));
  });

  it("returns null when the EOL config is missing", async () => {
    const empty = readers();
    empty.config.fetchNullable.mockResolvedValue(null);
    await expect(readHolder(empty, mint, null, NOW)).resolves.toBeNull();
  });
});

function readers(overrides: {
  status?: number;
  funded?: bigint;
  vesting?: PublicKey;
  troubleGate?: boolean;
  voteOpen?: boolean;
  voteClosesAt?: bigint;
  voteYes?: bigint;
  voteNo?: bigint;
  voteDenom?: bigint;
} = {}) {
  const staking = stakingConfigPda(mint);
  const vesting = overrides.vesting ?? Keypair.generate().publicKey;
  const escrow = Keypair.generate().publicKey;
  const teamPot = Keypair.generate().publicKey;
  const teamEntry = Keypair.generate().publicKey;
  const stakeVault = Keypair.generate().publicKey;
  const escrowVault = Keypair.generate().publicKey;
  return {
    config: {
      fetchNullable: vi.fn().mockResolvedValue({
        status: overrides.status ?? 0,
        decimals: 6,
        staking,
        vesting,
        escrow,
        usdcMint: usdc,
        ctokenMint: Keypair.generate().publicKey,
        treasuryUsdc: Keypair.generate().publicKey,
        protocolRevenueWallet: Keypair.generate().publicKey,
        escrowUsdc: BigInt(2_000_000),
        redemptionTreasuryFeeBps: 35,
        troubleGate: overrides.troubleGate ?? false,
        voteOpen: overrides.voteOpen ?? false,
        voteExecuted: false,
        voteClosesAt: overrides.voteClosesAt ?? BigInt(NOW + 100),
        voteYes: overrides.voteYes ?? BigInt(0),
        voteNo: overrides.voteNo ?? BigInt(0),
        voteDenom: overrides.voteDenom ?? BigInt(0),
      }),
    },
    stakeConfig: {
      fetchNullable: vi.fn().mockResolvedValue({ vault: stakeVault, feeBps: 0, liquidated: false }),
    },
    stakeAccount: {
      fetchNullable: vi.fn().mockResolvedValue({ amount: BigInt(1_500_000), lockUntil: BigInt(0), frozen: false }),
    },
    vestingConfig: {
      fetchNullable: vi.fn().mockResolvedValue({
        teamPot,
        investorPot: Keypair.generate().publicKey,
        teamEntry,
        schedule: 1,
        startTime: BigInt(NOW - 10),
        liquidationTimestamp: BigInt(0),
      }),
    },
    vestingEntry: {
      fetchNullable: vi.fn().mockResolvedValue({
        recipient: wallet,
        kind: 0,
        totalAllocation: BigInt(100_000_000),
        alreadyClaimed: BigInt(10_000_000),
      }),
    },
    escrowConfig: {
      fetchNullable: vi.fn().mockResolvedValue({
        vault: escrowVault,
        teamRecipient: wallet,
        schedule: 1,
        startTime: BigInt(NOW - 10),
        fundedPrincipal: overrides.funded ?? BigInt(8_000_000),
        alreadyDrawn: BigInt(1_000_000),
        advanceUnlocked: BigInt(0),
        status: 0,
      }),
    },
    redeemState: {
      fetchNullable: vi.fn().mockResolvedValue({
        csolOwed: BigInt(500_000_000),
        csolPaid: BigInt(100_000_000),
        usdcOwed: BigInt(1_000_000),
        usdcPaid: BigInt(0),
      }),
    },
    tokenAmount: vi.fn().mockResolvedValue(BigInt(3_000_000)),
    mintSupply: vi.fn().mockResolvedValue(BigInt(1_000_000_000)),
    walletToken: vi.fn().mockResolvedValue(BigInt(4_000_000)),
  } satisfies HolderReaders;
}
