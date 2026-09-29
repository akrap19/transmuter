import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { ctokenConfigPda, ctokenMintAuthorityPda, ctokenReservePda, CTOKEN_PROGRAM_ID } from "@/lib/solana/programs/ctoken";
import { eolConfigPda, eolRedeemPda } from "@/lib/solana/programs/eol-token";
import { findPda } from "@/lib/solana/pda";
import { STAKING_PROGRAM_ID, stakeAccountPda, stakingConfigPda } from "@/lib/solana/programs/staking";
import { RUNWAY_ESCROW_PROGRAM_ID } from "@/lib/solana/programs/runway-escrow";
import { VESTING_PROGRAM_ID } from "@/lib/solana/programs/vesting";
import {
  castVotePlan,
  escrowDrawPlan,
  executeLiquidationPlan,
  openVotePlan,
  redeemPlan,
  stakePlan,
  tokenToAtoms,
  unstakePlan,
  vestingClaimPlan,
} from "./holder-accounts";

const mint = Keypair.generate().publicKey;
const owner = Keypair.generate().publicKey;
const vault = Keypair.generate().publicKey;
const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const ctokenMint = Keypair.generate().publicKey;
const treasuryUsdc = Keypair.generate().publicKey;

describe("tokenToAtoms", () => {
  it("scales a decimal by the mint decimals and rejects zero or extra precision", () => {
    expect(tokenToAtoms("1.5", 6)).toBe(BigInt(1_500_000));
    expect(tokenToAtoms("2", 9)).toBe(BigInt(2_000_000_000));
    expect(tokenToAtoms("0", 6)).toBeNull();
    expect(tokenToAtoms("1.1234567", 6)).toBeNull();
  });
});

describe("holder account plans", () => {
  it("stakes from the wallet Token-2022 account into the staking vault", () => {
    const plan = stakePlan({ owner, mint, vault, decimals: 6, amount: "1.25" });
    const config = stakingConfigPda(mint);
    expect(plan?.atoms).toBe(BigInt(1_250_000));
    expect(plan?.source.equals(getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID))).toBe(true);
    expect(plan?.accounts).toMatchObject({
      owner,
      mint,
      vault,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    });
    expect(plan?.accounts.config.equals(config)).toBe(true);
    expect(plan?.accounts.stakeAccount.equals(stakeAccountPda(config, owner))).toBe(true);
  });

  it("unstakes back to the same wallet account", () => {
    const plan = unstakePlan({ owner, mint, vault, decimals: 6, amount: "0.5" });
    expect(plan?.atoms).toBe(BigInt(500_000));
    expect(plan?.destination.equals(getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID))).toBe(true);
    expect(plan?.accounts.destination.equals(plan.destination)).toBe(true);
  });

  it("claims vesting into the recipient Token-2022 account", () => {
    const vestingConfig = Keypair.generate().publicKey;
    const entry = Keypair.generate().publicKey;
    const pot = Keypair.generate().publicKey;
    const plan = vestingClaimPlan({ recipient: owner, mint, vestingConfig, entry, pot });
    expect(plan.destination.equals(getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID))).toBe(true);
    expect(plan.accounts).toMatchObject({
      recipient: owner,
      config: vestingConfig,
      entry,
      pot,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    });
  });

  it("draws runway USDC to the team recipient", () => {
    const escrowConfig = Keypair.generate().publicKey;
    const escrowVault = Keypair.generate().publicKey;
    const plan = escrowDrawPlan({ teamRecipient: owner, usdcMint, escrowConfig, vault: escrowVault });
    expect(plan.destination.equals(getAssociatedTokenAddressSync(usdcMint, owner, false, TOKEN_PROGRAM_ID))).toBe(true);
    expect(plan.accounts).toMatchObject({
      teamRecipient: owner,
      config: escrowConfig,
      vault: escrowVault,
      tokenProgram: TOKEN_PROGRAM_ID,
    });
  });

  it("redeems by burning the wallet EOL account and paying USDC plus cToken", () => {
    const plan = redeemPlan({
      user: owner,
      mint,
      ctokenMint,
      treasuryUsdc,
      usdcMint,
      decimals: 6,
      amount: "10",
    });
    const config = eolConfigPda(mint);
    const ctokenConfig = ctokenConfigPda(ctokenMint);
    expect(plan?.atoms).toBe(BigInt(10_000_000));
    expect(plan?.accounts.user).toBe(owner);
    expect(plan?.accounts.config.equals(config)).toBe(true);
    expect(plan?.accounts.userEol.equals(getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID))).toBe(true);
    expect(plan?.accounts.userUsdc.equals(getAssociatedTokenAddressSync(usdcMint, owner, false, TOKEN_PROGRAM_ID))).toBe(true);
    expect(plan?.accounts.redeemState.equals(eolRedeemPda(config, owner))).toBe(true);
    expect(plan?.accounts.ctokenProgram.equals(CTOKEN_PROGRAM_ID)).toBe(true);
    expect(plan?.accounts.ctokenConfig.equals(ctokenConfig)).toBe(true);
    expect(plan?.accounts.ctokenReserve.equals(ctokenReservePda(ctokenMint))).toBe(true);
    expect(plan?.accounts.ctokenMintAuthority.equals(ctokenMintAuthorityPda(ctokenMint))).toBe(true);
    expect(plan?.accounts.eolRecord.equals(findPda(CTOKEN_PROGRAM_ID, Buffer.from("eol"), ctokenConfig.toBuffer(), mint.toBuffer()))).toBe(true);
    expect(plan?.accounts.tokenProgram.equals(TOKEN_2022_PROGRAM_ID)).toBe(true);
    expect(plan?.accounts.usdcProgram.equals(TOKEN_PROGRAM_ID)).toBe(true);
  });

  it("opens a liquidation vote with the cranker and the EOL mint", () => {
    const plan = openVotePlan({ cranker: owner, mint });
    expect(plan).toMatchObject({ cranker: owner, mint });
    expect(plan.config.equals(eolConfigPda(mint))).toBe(true);
  });

  it("casts with the staker's account when staking is wired, otherwise the system program", () => {
    const staking = stakingConfigPda(mint);
    const wired = castVotePlan({ voter: owner, mint, staking, yes: true, weight: BigInt(4) });
    expect(wired.accounts.stakingProgram.equals(STAKING_PROGRAM_ID)).toBe(true);
    expect(wired.accounts.stakingConfig.equals(staking)).toBe(true);
    expect(wired.accounts.stakeAccount.equals(stakeAccountPda(staking, owner))).toBe(true);
    expect(wired.yes).toBe(true);
    expect(wired.weight).toBe(BigInt(4));

    const bare = castVotePlan({ voter: owner, mint, staking: null, yes: false, weight: BigInt(1) });
    expect(bare.accounts.stakingProgram.equals(SystemProgram.programId)).toBe(true);
    expect(bare.accounts.stakeAccount.equals(SystemProgram.programId)).toBe(true);
  });

  it("fills unused vesting and escrow seats with the cranker when those programs are not wired", () => {
    const plan = executeLiquidationPlan({
      cranker: owner,
      mint,
      ctokenMint,
      treasuryUsdc,
      protocolRevenue: owner,
      staking: null,
      vesting: null,
      escrow: null,
    });
    expect(plan.stakingProgram.equals(SystemProgram.programId)).toBe(true);
    expect(plan.stakingConfig.equals(owner)).toBe(true);
    expect(plan.vestingProgram.equals(SystemProgram.programId)).toBe(true);
    expect(plan.teamPot.equals(owner)).toBe(true);
    expect(plan.escrowProgram.equals(SystemProgram.programId)).toBe(true);
    expect(plan.ctokenProgram.equals(CTOKEN_PROGRAM_ID)).toBe(true);
    expect(plan.tokenProgram.equals(TOKEN_2022_PROGRAM_ID)).toBe(true);
  });

  it("uses the wired staking, vesting, and escrow accounts when liquidation executes", () => {
    const staking = stakingConfigPda(mint);
    const vesting = Keypair.generate().publicKey;
    const teamPot = Keypair.generate().publicKey;
    const teamEntry = Keypair.generate().publicKey;
    const escrow = Keypair.generate().publicKey;
    const escrowVault = Keypair.generate().publicKey;
    const plan = executeLiquidationPlan({
      cranker: owner,
      mint,
      ctokenMint,
      treasuryUsdc,
      protocolRevenue: owner,
      staking,
      vesting: { config: vesting, teamPot, teamEntry },
      escrow: { config: escrow, vault: escrowVault },
    });
    expect(plan.stakingProgram.equals(STAKING_PROGRAM_ID)).toBe(true);
    expect(plan.vestingProgram.equals(VESTING_PROGRAM_ID)).toBe(true);
    expect(plan.vestingConfig.equals(vesting)).toBe(true);
    expect(plan.teamPot.equals(teamPot)).toBe(true);
    expect(plan.teamEntry.equals(teamEntry)).toBe(true);
    expect(plan.escrowProgram.equals(RUNWAY_ESCROW_PROGRAM_ID)).toBe(true);
    expect(plan.escrowConfig.equals(escrow)).toBe(true);
    expect(plan.escrowVault.equals(escrowVault)).toBe(true);
  });
});
