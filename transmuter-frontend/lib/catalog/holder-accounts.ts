import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { findPda } from "@/lib/solana/pda";
import { ctokenConfigPda, ctokenMintAuthorityPda, ctokenReservePda, CTOKEN_PROGRAM_ID } from "@/lib/solana/programs/ctoken";
import { eolConfigPda, eolRedeemPda } from "@/lib/solana/programs/eol-token";
import { RUNWAY_ESCROW_PROGRAM_ID } from "@/lib/solana/programs/runway-escrow";
import { STAKING_PROGRAM_ID, stakeAccountPda, stakingConfigPda } from "@/lib/solana/programs/staking";
import { VESTING_PROGRAM_ID } from "@/lib/solana/programs/vesting";

const AMOUNT = /^\d+(\.\d+)?$/;

export function tokenToAtoms(amount: string, decimals: number): bigint | null {
  const trimmed = amount.trim();
  if (!AMOUNT.test(trimmed) || decimals < 0 || decimals > 12) return null;
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > decimals) return null;
  const scale = BigInt(10) ** BigInt(decimals);
  const atoms = BigInt(whole) * scale + BigInt((frac.padEnd(decimals, "0") || "0"));
  return atoms > BigInt(0) ? atoms : null;
}

export function stakePlan(input: {
  owner: PublicKey;
  mint: PublicKey;
  vault: PublicKey;
  decimals: number;
  amount: string;
}) {
  const atoms = tokenToAtoms(input.amount, input.decimals);
  if (atoms == null) return null;
  const config = stakingConfigPda(input.mint);
  const source = tokenAta(input.mint, input.owner);
  return {
    atoms,
    source,
    accounts: {
      owner: input.owner,
      config,
      mint: input.mint,
      vault: input.vault,
      source,
      stakeAccount: stakeAccountPda(config, input.owner),
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    },
  };
}

export function unstakePlan(input: {
  owner: PublicKey;
  mint: PublicKey;
  vault: PublicKey;
  decimals: number;
  amount: string;
}) {
  const atoms = tokenToAtoms(input.amount, input.decimals);
  if (atoms == null) return null;
  const config = stakingConfigPda(input.mint);
  const destination = tokenAta(input.mint, input.owner);
  return {
    atoms,
    destination,
    accounts: {
      owner: input.owner,
      config,
      mint: input.mint,
      vault: input.vault,
      stakeAccount: stakeAccountPda(config, input.owner),
      destination,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    },
  };
}

export function vestingClaimPlan(input: {
  recipient: PublicKey;
  mint: PublicKey;
  vestingConfig: PublicKey;
  entry: PublicKey;
  pot: PublicKey;
}) {
  const destination = tokenAta(input.mint, input.recipient);
  return {
    destination,
    accounts: {
      recipient: input.recipient,
      config: input.vestingConfig,
      entry: input.entry,
      pot: input.pot,
      destination,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    },
  };
}

export function escrowDrawPlan(input: {
  teamRecipient: PublicKey;
  usdcMint: PublicKey;
  escrowConfig: PublicKey;
  vault: PublicKey;
}) {
  const destination = getAssociatedTokenAddressSync(input.usdcMint, input.teamRecipient, false, TOKEN_PROGRAM_ID);
  return {
    destination,
    accounts: {
      teamRecipient: input.teamRecipient,
      config: input.escrowConfig,
      vault: input.vault,
      destination,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
  };
}

export function redeemPlan(input: {
  user: PublicKey;
  mint: PublicKey;
  ctokenMint: PublicKey;
  treasuryUsdc: PublicKey;
  usdcMint: PublicKey;
  decimals: number;
  amount: string;
}) {
  const atoms = tokenToAtoms(input.amount, input.decimals);
  if (atoms == null) return null;
  const config = eolConfigPda(input.mint);
  const ctokenConfig = ctokenConfigPda(input.ctokenMint);
  const userEol = tokenAta(input.mint, input.user);
  const userUsdc = getAssociatedTokenAddressSync(input.usdcMint, input.user, false, TOKEN_PROGRAM_ID);
  return {
    atoms,
    userEol,
    userUsdc,
    accounts: {
      user: input.user,
      config,
      mint: input.mint,
      userEol,
      treasuryUsdc: input.treasuryUsdc,
      userUsdc,
      redeemState: eolRedeemPda(config, input.user),
      ...ctokenAccounts(input.mint, input.ctokenMint, ctokenConfig),
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      usdcProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    },
  };
}

export function openVotePlan(input: { cranker: PublicKey; mint: PublicKey }) {
  return {
    cranker: input.cranker,
    config: eolConfigPda(input.mint),
    mint: input.mint,
  };
}

export function castVotePlan(input: {
  voter: PublicKey;
  mint: PublicKey;
  staking: PublicKey | null;
  yes: boolean;
  weight: bigint;
}) {
  const wired = input.staking != null;
  return {
    yes: input.yes,
    weight: input.weight,
    accounts: {
      voter: input.voter,
      config: eolConfigPda(input.mint),
      stakingProgram: wired ? STAKING_PROGRAM_ID : SystemProgram.programId,
      stakingConfig: wired ? input.staking! : SystemProgram.programId,
      stakeAccount: wired ? stakeAccountPda(input.staking!, input.voter) : SystemProgram.programId,
    },
  };
}

export function executeLiquidationPlan(input: {
  cranker: PublicKey;
  mint: PublicKey;
  ctokenMint: PublicKey;
  treasuryUsdc: PublicKey;
  protocolRevenue: PublicKey;
  staking: PublicKey | null;
  vesting: { config: PublicKey; teamPot: PublicKey; teamEntry: PublicKey } | null;
  escrow: { config: PublicKey; vault: PublicKey } | null;
}) {
  const ctokenConfig = ctokenConfigPda(input.ctokenMint);
  return {
    cranker: input.cranker,
    config: eolConfigPda(input.mint),
    mint: input.mint,
    treasuryUsdc: input.treasuryUsdc,
    protocolRevenueWallet: input.protocolRevenue,
    stakingProgram: input.staking ? STAKING_PROGRAM_ID : SystemProgram.programId,
    stakingConfig: input.staking ?? input.cranker,
    vestingProgram: input.vesting ? VESTING_PROGRAM_ID : SystemProgram.programId,
    vestingConfig: input.vesting?.config ?? input.cranker,
    teamPot: input.vesting?.teamPot ?? input.cranker,
    teamEntry: input.vesting?.teamEntry ?? input.cranker,
    escrowProgram: input.escrow ? RUNWAY_ESCROW_PROGRAM_ID : SystemProgram.programId,
    escrowConfig: input.escrow?.config ?? input.cranker,
    escrowVault: input.escrow?.vault ?? input.cranker,
    ...ctokenAccounts(input.mint, input.ctokenMint, ctokenConfig),
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    usdcProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  };
}

function tokenAta(mint: PublicKey, owner: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID);
}

function ctokenAccounts(mint: PublicKey, ctokenMint: PublicKey, ctokenConfig: PublicKey) {
  return {
    ctokenProgram: CTOKEN_PROGRAM_ID,
    ctokenConfig,
    ctokenReserve: ctokenReservePda(ctokenMint),
    ctokenMint,
    ctokenMintAuthority: ctokenMintAuthorityPda(ctokenMint),
    ctokenTreasury: getAssociatedTokenAddressSync(ctokenMint, eolConfigPda(mint), true, TOKEN_2022_PROGRAM_ID),
    eolRecord: findPda(CTOKEN_PROGRAM_ID, Buffer.from("eol"), ctokenConfig.toBuffer(), mint.toBuffer()),
    token2022Ctoken: TOKEN_2022_PROGRAM_ID,
  };
}
