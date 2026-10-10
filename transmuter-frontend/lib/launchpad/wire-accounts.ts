import { getAssociatedTokenAddressSync, NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { RAYDIUM_CPMM_PROGRAM_ID, raydiumPoolKeys } from "@/lib/solana/raydium-cpmm";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { findPda } from "@/lib/solana/pda";
import { PROGRAM_IDS } from "@/lib/solana/program-ids";
import { ctokenConfigPda } from "@/lib/solana/programs/ctoken";
import { eolConfigPda, eolMintAuthorityPda } from "@/lib/solana/programs/eol-token";
import { factoryPda, launchPda } from "@/lib/solana/programs/factory";
import { escrowConfigPda } from "@/lib/solana/programs/runway-escrow";
import { stakingConfigPda } from "@/lib/solana/programs/staking";
import { vestingConfigPda, vestingEntryPda } from "@/lib/solana/programs/vesting";
import { WIRE_ESCROW, WIRE_VESTING, type WireStepId } from "./wire-plan";

const CTOKEN_PROGRAM_ID = new PublicKey(PROGRAM_IDS.ctoken);
const EOL_PROGRAM_ID = new PublicKey(PROGRAM_IDS.eolToken);
const STAKING_PROGRAM_ID = new PublicKey(PROGRAM_IDS.staking);
const VESTING_PROGRAM_ID = new PublicKey(PROGRAM_IDS.vesting);
const ESCROW_PROGRAM_ID = new PublicKey(PROGRAM_IDS.runwayEscrow);

export type WireMethod =
  | "wireEol"
  | "wireStaking"
  | "wireVesting"
  | "wireEscrow"
  | "wireRegister"
  | "wireDao"
  | "wirePoolUsdc"
  | "wirePoolSol"
  | "wireRaydiumPools"
  | "wireVaults";

export type WireLaunch = {
  launchId: number;
  mint: PublicKey;
  backingCtoken: PublicKey;
  teamRecipient: PublicKey;
  requiredMask: number;
  cranker: PublicKey;
  usdcMint: PublicKey;
  protocolRevenueWallet: PublicKey;
  registry: PublicKey;
  dao: PublicKey;
};

export type PreparedWireStep = {
  id: WireStepId;
  kind: "factory" | "ata";
  method?: WireMethod;
  accounts: Record<string, PublicKey>;
  signers: Keypair[];
};

type PrepareOptions = {
  mintSigner?: Keypair;
  generateKeypair?: () => Keypair;
};

export function prepareWireStep(step: WireStepId, launch: WireLaunch, options: PrepareOptions = {}): PreparedWireStep {
  const derived = derive(launch);
  const base = {
    cranker: launch.cranker,
    factory: derived.factory,
    launch: derived.launch,
  };

  switch (step) {
    case "eol":
      return factoryStep(step, "wireEol", [requireMintSigner(launch, options)], {
        ...base,
        mint: launch.mint,
        mintAuthority: derived.mintAuthority,
        eolConfig: derived.eolConfig,
        usdcMint: launch.usdcMint,
        ctokenMint: launch.backingCtoken,
        protocolRevenueWallet: launch.protocolRevenueWallet,
        vestingConfig: derived.vestingConfig,
        stakingConfig: derived.stakingConfig,
        escrowConfig: derived.escrowConfig,
        ctokenTreasury: derived.ctokenTreasury,
        eolProgram: EOL_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      });
    case "staking": {
      const [vault] = take(options, 1);
      return factoryStep(step, "wireStaking", [vault], {
        ...base,
        mint: launch.mint,
        eolConfig: derived.eolConfig,
        stakingConfig: derived.stakingConfig,
        vault: vault.publicKey,
        stakingProgram: STAKING_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      });
    }
    case "vesting": {
      const [teamPot, investorPot] = take(options, 2);
      const vestingConfig = derived.vestingConfig;
      return factoryStep(step, "wireVesting", [teamPot, investorPot], {
        ...base,
        mint: launch.mint,
        eolConfig: derived.eolConfig,
        founder: launch.cranker,
        teamRecipient: launch.teamRecipient,
        vestingConfig,
        teamPot: teamPot.publicKey,
        investorPot: investorPot.publicKey,
        teamEntry: vestingEntryPda(vestingConfig, launch.teamRecipient),
        vestingProgram: VESTING_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      });
    }
    case "escrow": {
      const [vault] = take(options, 1);
      return factoryStep(step, "wireEscrow", [vault], {
        ...base,
        eolConfig: derived.eolConfig,
        usdcMint: launch.usdcMint,
        teamRecipient: launch.teamRecipient,
        dao: launch.dao,
        registry: launch.registry,
        escrowConfig: derived.escrowConfig,
        vault: vault.publicKey,
        escrowProgram: ESCROW_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      });
    }
    case "treasuryAta":
      return {
        id: step,
        kind: "ata",
        signers: [],
        accounts: {
          payer: launch.cranker,
          ata: derived.ctokenTreasury,
          owner: derived.eolConfig,
          mint: launch.backingCtoken,
        },
      };
    case "register":
      return factoryStep(step, "wireRegister", [], {
        ...base,
        eolConfig: derived.eolConfig,
        ctokenProgram: CTOKEN_PROGRAM_ID,
        ctokenConfig: derived.ctokenConfig,
        ctokenTreasury: derived.ctokenTreasury,
        eolRecord: derived.eolRecord,
        systemProgram: SystemProgram.programId,
      });
    case "dao":
      return factoryStep(step, "wireDao", [], base);
    case "poolUsdc":
    case "poolSol":
      return raydiumPoolStep(step, launch, base);
    case "vaults": {
      const [saleUsdc, saleToken, lpToken, teamToken, treasuryUsdc, feeVault] = take(options, 6);
      return factoryStep(step, "wireVaults", [saleUsdc, saleToken, lpToken, teamToken, treasuryUsdc, feeVault], {
        ...base,
        eolConfig: derived.eolConfig,
        mint: launch.mint,
        mintAuthority: derived.mintAuthority,
        usdcMint: launch.usdcMint,
        saleUsdcVault: saleUsdc.publicKey,
        saleTokenVault: saleToken.publicKey,
        lpTokenVault: lpToken.publicKey,
        teamTokenVault: teamToken.publicKey,
        treasuryUsdc: treasuryUsdc.publicKey,
        feeVault: feeVault.publicKey,
        ctokenTreasury: derived.ctokenTreasury,
        eolProgram: EOL_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        usdcProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      });
    }
  }
}

function raydiumPoolStep(
  step: WireStepId,
  launch: WireLaunch,
  base: { cranker: PublicKey; factory: PublicKey; launch: PublicKey },
): PreparedWireStep {
  return factoryStep(step, "wireRaydiumPools", [], {
    ...base,
    usdcMint: launch.usdcMint,
    wsolMint: NATIVE_MINT,
    pool: raydiumPoolKeys(launch.usdcMint, NATIVE_MINT).poolState,
    dexProgram: RAYDIUM_CPMM_PROGRAM_ID,
  });
}

function factoryStep(
  id: WireStepId,
  method: WireMethod,
  signers: Keypair[],
  accounts: Record<string, PublicKey>,
): PreparedWireStep {
  return { id, kind: "factory", method, signers, accounts };
}

function derive(launch: WireLaunch) {
  const eolConfig = eolConfigPda(launch.mint);
  const vestingRequired = (launch.requiredMask & WIRE_VESTING) !== 0;
  const escrowRequired = (launch.requiredMask & WIRE_ESCROW) !== 0;
  const ctokenConfig = ctokenConfigPda(launch.backingCtoken);
  return {
    factory: factoryPda(),
    launch: launchPda(launch.launchId),
    eolConfig,
    mintAuthority: eolMintAuthorityPda(launch.mint),
    stakingConfig: stakingConfigPda(launch.mint),
    vestingConfig: vestingRequired ? vestingConfigPda(launch.mint) : SystemProgram.programId,
    escrowConfig: escrowRequired ? escrowConfigPda(eolConfig, launch.usdcMint) : SystemProgram.programId,
    ctokenTreasury: getAssociatedTokenAddressSync(launch.backingCtoken, eolConfig, true, TOKEN_2022_PROGRAM_ID),
    ctokenConfig,
    eolRecord: findPda(CTOKEN_PROGRAM_ID, Buffer.from("eol"), ctokenConfig.toBuffer(), launch.mint.toBuffer()),
  };
}

function requireMintSigner(launch: WireLaunch, options: PrepareOptions): Keypair {
  const signer = options.mintSigner;
  if (!signer || !signer.publicKey.equals(launch.mint)) {
    throw new Error("Mint keypair is missing. Wiring cannot resume in this browser session.");
  }
  return signer;
}

function take(options: PrepareOptions, count: number): Keypair[] {
  const generate = options.generateKeypair ?? Keypair.generate;
  return Array.from({ length: count }, () => generate());
}
