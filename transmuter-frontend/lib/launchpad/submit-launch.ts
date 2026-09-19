import { BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { factoryMintIndexPda, factoryPda, launchPda } from "@/lib/solana/programs/factory";
import { PROGRAM_IDS } from "@/lib/solana/program-ids";
import { mapLaunchpadToCreateLaunch, type MappedCreateLaunchParams } from "./map-create-launch";
import { dataUrlToUpload, type MediaUpload } from "./media";
import { buildMetaplexMetadata } from "./metaplex-metadata";
import type { CToken, LaunchpadState } from "./types";

export type LaunchSubmitStatus = "uploading" | "signing";

export type FactoryCreateLaunchClient = {
  methods: {
    createLaunch: (
      launchId: BN,
      params: MappedCreateLaunchParams,
    ) => {
      accounts: (accounts: Record<string, PublicKey>) => {
        rpc: () => Promise<string>;
      };
    };
  };
  account: {
    factoryConfig: {
      fetch: (address: PublicKey) => Promise<{ totalLaunches: BN }>;
    };
  };
};

export type SubmitCreateLaunchInput = {
  state: LaunchpadState;
  wallet: string;
  nowSeconds: number;
  whitelist: CToken[];
  daoContract?: string;
  generateMint?: () => Keypair;
  factory: FactoryCreateLaunchClient;
  upload: (file: MediaUpload) => Promise<{ url: string }>;
  onStatus?: (status: LaunchSubmitStatus) => void;
};

export type SubmitCreateLaunchResult = {
  signature: string;
  launchId: number;
  mint: string;
  metadataUri: string;
};

export async function submitCreateLaunch(
  input: SubmitCreateLaunchInput,
): Promise<SubmitCreateLaunchResult> {
  input.onStatus?.("uploading");

  let imageUrl: string | null = null;
  let imageMimeType: string | undefined;
  if (input.state.logoUrl?.startsWith("data:")) {
    const logo = dataUrlToUpload(input.state.logoUrl, input.state.logoFileName ?? "logo.png");
    imageMimeType = logo.contentType;
    imageUrl = (await input.upload(logo)).url;
  } else if (input.state.logoUrl) {
    imageUrl = input.state.logoUrl;
  }

  const metadata = buildMetaplexMetadata({
    name: input.state.tokenName.trim(),
    symbol: input.state.tokenTicker.trim().toUpperCase(),
    description: input.state.tokenDesc.trim(),
    image: imageUrl,
    imageMimeType,
    externalUrl: input.state.tokenWebsite,
    twitter: input.state.tokenTwitter,
    telegram: input.state.tokenTelegram,
    discord: input.state.tokenDiscord,
  });
  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
  const metadataUri = (
    await input.upload({
      bytes: metadataBytes,
      contentType: "application/json",
      filename: `${metadata.symbol.toLowerCase()}.json`,
    })
  ).url;

  const mapped = mapLaunchpadToCreateLaunch({
    state: input.state,
    nowSeconds: input.nowSeconds,
    teamRecipient: input.wallet,
    daoContract: input.daoContract ?? PROGRAM_IDS.dao,
    whitelist: input.whitelist,
  });

  const factoryPdaKey = factoryPda();
  const factoryConfig = await input.factory.account.factoryConfig.fetch(factoryPdaKey);
  const launchIdBn = new BN(factoryConfig.totalLaunches.toString());
  const launchId = Number(factoryConfig.totalLaunches.toString());
  const mint = (input.generateMint ?? Keypair.generate)();
  const creator = new PublicKey(input.wallet);

  input.onStatus?.("signing");
  const signature = await input.factory.methods
    .createLaunch(launchIdBn, mapped.params)
    .accounts({
      creator,
      factory: factoryPdaKey,
      mint: mint.publicKey,
      backingCtoken: mapped.accounts.backingCtoken,
      fallbackCtoken: mapped.accounts.fallbackCtoken,
      backingListing: mapped.accounts.backingListing,
      fallbackListing: mapped.accounts.fallbackListing,
      teamRecipient: mapped.accounts.teamRecipient,
      daoContract: mapped.accounts.daoContract,
      launch: launchPda(launchId),
      mintIndex: factoryMintIndexPda(mint.publicKey),
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return {
    signature,
    launchId,
    mint: mint.publicKey.toBase58(),
    metadataUri,
  };
}
