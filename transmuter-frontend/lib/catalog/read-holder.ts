import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import type { AccountFetcher } from "@/lib/solana/accounts";
import { eolConfigPda, eolRedeemPda } from "@/lib/solana/programs/eol-token";
import { stakeAccountPda } from "@/lib/solana/programs/staking";
import { vestingEntryPda } from "@/lib/solana/programs/vesting";
import { DAO_SHIM_QUORUM_MET, voteThresholds } from "./governance";
import { chainAmount, liveStatus, type ChainAmount } from "./live-sale";
import { redeemAvailable } from "./redeem";
import type { HolderSubmit } from "./submit-holder";
import type { CoinEscrow, CoinRedeem, CoinStake, CoinVesting, CoinVote, EscrowStatus, LaunchStatus } from "./types";

const USDC_DECIMALS = 6;
const CSOL_DECIMALS = 9;

export type EolHolderConfig = {
  status: number;
  decimals: number;
  staking: PublicKey;
  vesting: PublicKey;
  escrow: PublicKey;
  usdcMint: PublicKey;
  ctokenMint: PublicKey;
  treasuryUsdc: PublicKey;
  protocolRevenueWallet: PublicKey;
  escrowUsdc: ChainAmount;
  redemptionTreasuryFeeBps: number;
  troubleGate: boolean;
  voteOpen: boolean;
  voteExecuted: boolean;
  voteClosesAt: ChainAmount;
  voteYes: ChainAmount;
  voteNo: ChainAmount;
  voteDenom: ChainAmount;
};

export type HolderReaders = {
  config: AccountFetcher<EolHolderConfig>;
  stakeConfig: AccountFetcher<{ vault: PublicKey; feeBps: number; liquidated: boolean }>;
  stakeAccount: AccountFetcher<{ amount: ChainAmount; lockUntil: ChainAmount; frozen: boolean }>;
  vestingConfig: AccountFetcher<{
    teamPot: PublicKey;
    investorPot: PublicKey;
    teamEntry: PublicKey;
    schedule: number;
    startTime: ChainAmount;
    liquidationTimestamp: ChainAmount;
  }>;
  vestingEntry: AccountFetcher<{
    recipient: PublicKey;
    kind: number;
    totalAllocation: ChainAmount;
    alreadyClaimed: ChainAmount;
  }>;
  escrowConfig: AccountFetcher<{
    vault: PublicKey;
    teamRecipient: PublicKey;
    schedule: number;
    startTime: ChainAmount;
    fundedPrincipal: ChainAmount;
    alreadyDrawn: ChainAmount;
    advanceUnlocked: ChainAmount;
    status: number;
  }>;
  redeemState: AccountFetcher<{
    csolOwed: ChainAmount;
    csolPaid: ChainAmount;
    usdcOwed: ChainAmount;
    usdcPaid: ChainAmount;
  }>;
  tokenAmount: (address: PublicKey) => Promise<bigint>;
  mintSupply: (mint: PublicKey) => Promise<bigint>;
  walletToken: (mint: PublicKey, owner: PublicKey) => Promise<bigint>;
};

export type HolderView = {
  stake: CoinStake | null;
  vesting: CoinVesting | null;
  escrow: CoinEscrow | null;
  redeem: CoinRedeem | null;
  votes: CoinVote[];
  offers: { openVote: boolean; executeVote: boolean };
  daoQuorumMet: false;
  asOf: number;
  chain: HolderSubmit;
};

export async function readHolder(
  readers: HolderReaders,
  mint: PublicKey,
  wallet: PublicKey | null,
  now: number,
): Promise<HolderView | null> {
  const config = await readers.config.fetchNullable(eolConfigPda(mint));
  if (!config) return null;
  const status = liveStatus(null, Number(config.status));
  if (!status) return null;

  const decimals = Number(config.decimals);
  const stakingWired = wired(config.staking);
  const vestingWired = wired(config.vesting);
  const escrowWired = wired(config.escrow);

  const [stakeConfig, vestingConfig, escrowConfig, supply, walletAtoms, treasuryUsdc, ctokenAtoms] = await Promise.all([
    stakingWired ? readers.stakeConfig.fetchNullable(config.staking) : Promise.resolve(null),
    vestingWired ? readers.vestingConfig.fetchNullable(config.vesting) : Promise.resolve(null),
    escrowWired ? readers.escrowConfig.fetchNullable(config.escrow) : Promise.resolve(null),
    readers.mintSupply(mint),
    wallet ? readers.walletToken(mint, wallet) : Promise.resolve(BigInt(0)),
    readers.tokenAmount(config.treasuryUsdc),
    readers.tokenAmount(ctokenTreasury(mint, config.ctokenMint)),
  ]);

  const stakeAccount =
    wallet && stakingWired ? await readers.stakeAccount.fetchNullable(stakeAccountPda(config.staking, wallet)) : null;
  const stakeAtoms = stakeAccount ? chainAmount(stakeAccount.amount) : BigInt(0);
  const frozen = stakeAccount?.frozen === true;
  const lockUntil = stakeAccount ? Number(chainAmount(stakeAccount.lockUntil)) : 0;

  const entry = vestingConfig ? await walletEntry(readers, config.vesting, vestingConfig.teamEntry, wallet) : null;
  const pot = entry && vestingConfig ? (entry.kind === 1 ? vestingConfig.investorPot : vestingConfig.teamPot) : null;

  const funded = escrowConfig ? chainAmount(escrowConfig.fundedPrincipal) : BigInt(0);
  const escrowLive = escrowConfig && funded > BigInt(0) ? escrowConfig : null;

  const redeemState =
    wallet && redeemAvailable(status) ? await readers.redeemState.fetchNullable(eolRedeemPda(eolConfigPda(mint), wallet)) : null;

  const closesAt = Number(chainAmount(config.voteClosesAt));
  const vote: CoinVote | null = config.voteOpen
    ? {
        kind: "liquidation",
        closesAt,
        yesWeight: units(chainAmount(config.voteYes), decimals),
        noWeight: units(chainAmount(config.voteNo), decimals),
        denom: units(chainAmount(config.voteDenom), decimals),
        ...voteThresholds("liquidation"),
      }
    : null;

  return {
    stake: stakeConfig
      ? {
          staked: units(stakeAtoms, decimals),
          weight: frozen ? 0 : units(stakeAtoms, decimals),
          voterLockedUntil: lockUntil > 0 ? lockUntil : null,
          walletBalance: units(walletAtoms, decimals),
          feeBps: Number(stakeConfig.feeBps),
          liquidated: stakeConfig.liquidated,
        }
      : null,
    vesting:
      entry && vestingConfig
        ? {
            recipient: entry.recipient.toBase58(),
            kind: entry.kind === 1 ? "investor" : "team",
            schedule: Number(vestingConfig.schedule),
            startTime: Number(chainAmount(vestingConfig.startTime)),
            liquidationTimestamp: Number(chainAmount(vestingConfig.liquidationTimestamp)),
            totalAllocation: units(chainAmount(entry.totalAllocation), decimals),
            alreadyClaimed: units(chainAmount(entry.alreadyClaimed), decimals),
          }
        : null,
    escrow: escrowLive
      ? {
          teamRecipient: escrowLive.teamRecipient.toBase58(),
          schedule: Number(escrowLive.schedule),
          startTime: Number(chainAmount(escrowLive.startTime)),
          fundedPrincipal: units(chainAmount(escrowLive.fundedPrincipal), USDC_DECIMALS),
          alreadyDrawn: units(chainAmount(escrowLive.alreadyDrawn), USDC_DECIMALS),
          advanceUnlocked: units(chainAmount(escrowLive.advanceUnlocked), USDC_DECIMALS),
          status: escrowStatus(Number(escrowLive.status)),
        }
      : null,
    redeem: redeemAvailable(status)
      ? redeemView(config, decimals, supply, walletAtoms, treasuryUsdc, ctokenAtoms, redeemState)
      : null,
    votes: vote ? [vote] : [],
    offers: liquidationOffers(status, config, now),
    daoQuorumMet: DAO_SHIM_QUORUM_MET,
    asOf: now,
    chain: {
      signer: wallet ?? PublicKey.default,
      mint,
      decimals,
      stakeVault: stakeConfig?.vault ?? null,
      vesting: entry && pot && wallet && entry.recipient.equals(wallet) ? { config: config.vesting, entry: entry.address, pot } : null,
      escrow: escrowLive ? { config: config.escrow, vault: escrowLive.vault } : null,
      ctokenMint: config.ctokenMint,
      treasuryUsdc: config.treasuryUsdc,
      usdcMint: config.usdcMint,
      protocolRevenue: config.protocolRevenueWallet,
      staking: stakingWired ? config.staking : null,
      vestingSide: vestingConfig
        ? { config: config.vesting, teamPot: vestingConfig.teamPot, teamEntry: vestingConfig.teamEntry }
        : null,
      escrowSide: escrowConfig ? { config: config.escrow, vault: escrowConfig.vault } : null,
      weight: frozen ? BigInt(0) : stakeAtoms,
    },
  };
}

function liquidationOffers(status: LaunchStatus, config: EolHolderConfig, now: number) {
  const openVote = status === "active" && config.troubleGate && !config.voteOpen && !config.voteExecuted;
  const executeVote =
    status === "active" && config.voteOpen && !config.voteExecuted && now >= Number(chainAmount(config.voteClosesAt));
  return { openVote, executeVote };
}

function redeemView(
  config: EolHolderConfig,
  decimals: number,
  supply: bigint,
  walletAtoms: bigint,
  treasuryUsdc: bigint,
  ctokenAtoms: bigint,
  redeemState: { csolOwed: ChainAmount; csolPaid: ChainAmount; usdcOwed: ChainAmount; usdcPaid: ChainAmount } | null,
): CoinRedeem {
  return {
    walletBalance: units(walletAtoms, decimals),
    circulatingSupply: units(supply, decimals),
    cTokenTreasury: units(ctokenAtoms, CSOL_DECIMALS),
    unconvertedUsdc: units(treasuryUsdc, USDC_DECIMALS),
    escrowUsdc: units(chainAmount(config.escrowUsdc), USDC_DECIMALS),
    treasuryFeeBps: Number(config.redemptionTreasuryFeeBps),
    treasuryCsolAvailable: units(ctokenAtoms, CSOL_DECIMALS),
    treasuryUsdcAvailable: units(treasuryUsdc, USDC_DECIMALS),
    legs: [
      {
        asset: "cSOL",
        owed: redeemState ? units(chainAmount(redeemState.csolOwed), CSOL_DECIMALS) : 0,
        paid: redeemState ? units(chainAmount(redeemState.csolPaid), CSOL_DECIMALS) : 0,
      },
      {
        asset: "USDC",
        owed: redeemState ? units(chainAmount(redeemState.usdcOwed), USDC_DECIMALS) : 0,
        paid: redeemState ? units(chainAmount(redeemState.usdcPaid), USDC_DECIMALS) : 0,
      },
    ],
  };
}

async function walletEntry(
  readers: HolderReaders,
  vesting: PublicKey,
  teamEntry: PublicKey,
  wallet: PublicKey | null,
) {
  if (wallet) {
    const own = await readers.vestingEntry.fetchNullable(vestingEntryPda(vesting, wallet));
    if (own) return { ...own, address: vestingEntryPda(vesting, wallet) };
  }
  if (!wired(teamEntry)) return null;
  const team = await readers.vestingEntry.fetchNullable(teamEntry);
  return team ? { ...team, address: teamEntry } : null;
}

function escrowStatus(status: number): EscrowStatus {
  if (status === 1) return "halted";
  if (status === 2) return "liquidated";
  return "active";
}

function units(atoms: bigint, decimals: number): number {
  return Number(atoms) / 10 ** decimals;
}

function wired(key: PublicKey): boolean {
  return !key.equals(PublicKey.default);
}

function ctokenTreasury(mint: PublicKey, ctokenMint: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(ctokenMint, eolConfigPda(mint), true, TOKEN_2022_PROGRAM_ID);
}
