import { NATIVE_MINT, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { readFactoryLaunchByMint, type AccountFetcher } from "@/lib/solana/accounts";
import { eolConfigPda, eolDepositPda, eolLpSignerPda } from "@/lib/solana/programs/eol-token";
import { raydiumPoolKeys } from "@/lib/solana/raydium-cpmm";
import { backingFromChain } from "./backing";
import { chainAmount, liveStatus, type ChainAmount } from "./live-sale";
import { mockNativePoolPda, mockPoolPda, readMockPoolVaults, readNativePoolVault } from "./post-sale-accounts";
import { postSaleNote, postSaleOffers } from "./post-sale";
import type { PostSaleChain } from "./submit-post-sale";

export type EolPostSaleConfig = {
  status: number;
  saleEnd: ChainAmount;
  soldTokens: ChainAmount;
  saleTokens: ChainAmount;
  convertDone: boolean;
  saleUsdcVault: PublicKey;
  saleTokenVault: PublicKey;
  lpTokenVault: PublicKey;
  treasuryUsdc: PublicKey;
  ctokenTreasury: PublicKey;
  usdcMint: PublicKey;
  ctokenMint: PublicKey;
  escrow: PublicKey;
  vesting: PublicKey;
  escrowUsdc: ChainAmount;
  solResidue: ChainAmount;
  oraclePrice: ChainAmount;
  oracleExpo: number;
  totalSupply: ChainAmount;
  salePrice: ChainAmount;
  decimals: number;
  lpUsdcShareBps: number;
  governedMintPctBps: number;
  rmAllowanceOpen: boolean;
  rmGovOpen: boolean;
};

export type PostSaleReaders = {
  config: AccountFetcher<EolPostSaleConfig>;
  launch: AccountFetcher<{ poolUsdc: PublicKey }>;
  mintIndex: AccountFetcher<{ launchId: { toString(): string } }>;
  deposit: AccountFetcher<{ amount: ChainAmount; claimed: boolean }>;
  escrow: AccountFetcher<{ vault: PublicKey }>;
  accountData: (address: PublicKey) => Promise<Uint8Array | null>;
  tokenAmount: (address: PublicKey) => Promise<bigint>;
  lamports: (address: PublicKey) => Promise<bigint>;
  mintSupply: (address: PublicKey) => Promise<bigint>;
};

export async function readPostSale(
  readers: PostSaleReaders,
  mint: PublicKey,
  wallet: PublicKey | null,
  now: number,
) {
  const config = await readers.config.fetchNullable(eolConfigPda(mint));
  if (!config) return null;

  const status = liveStatus(null, Number(config.status));
  if (!status) return null;

  const wsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, eolConfigPda(mint), true, TOKEN_PROGRAM_ID);
  // The launch lookup and every config-derived read only need the config and the
  // mint, so issue them together. With the batching connection they collapse into
  // one getMultipleAccounts instead of waiting on each other round trip by round trip.
  const launchPromise = readFactoryLaunchByMint({ launch: readers.launch, mintIndex: readers.mintIndex }, mint);
  const corePromise = Promise.all([
    readers.accountData(wsolAta),
    wallet ? readers.deposit.fetchNullable(eolDepositPda(eolConfigPda(mint), wallet)) : Promise.resolve(null),
    isSet(config.escrow) ? readers.escrow.fetchNullable(config.escrow) : Promise.resolve(null),
    readers.tokenAmount(config.treasuryUsdc),
    readers.tokenAmount(config.ctokenTreasury),
    readers.tokenAmount(config.lpTokenVault),
    readers.tokenAmount(config.saleUsdcVault),
    readers.tokenAmount(wsolAta),
    readers.mintSupply(mint),
    readers.lamports(eolLpSignerPda(mint)),
  ]);
  const [launch, core] = await Promise.all([launchPromise, corePromise]);
  const [wsolData, deposit, escrow, treasuryUsdc, ctokenAtoms, lpTokenAtoms, saleUsdcAtoms, wsolAtoms, supply, lpLamports] =
    core;

  const cpmm = raydiumPoolKeys(config.usdcMint, NATIVE_MINT).poolState;
  const venue = launch?.account.poolUsdc.equals(cpmm) ? "raydium" : "mock";
  const poolPda = mockPoolPda(mint, config.usdcMint);
  const nativePda = mockNativePoolPda(config.usdcMint);
  const [poolData, nativeData] = await Promise.all([
    venue === "mock" ? readers.accountData(poolPda) : Promise.resolve(null),
    venue === "mock" ? readers.accountData(nativePda) : Promise.resolve(null),
  ]);
  const vaults = poolData ? readMockPoolVaults(poolData) : null;
  const nativeVault = nativeData ? readNativePoolVault(nativeData) : null;

  const depositAtoms = deposit ? chainAmount(deposit.amount) : BigInt(0);
  const backing = backingFromChain({
    ctokenAtoms,
    unconvertedUsdcAtoms: treasuryUsdc + chainAmount(config.escrowUsdc),
    solResidueLamports: chainAmount(config.solResidue),
    oraclePrice: chainAmount(config.oraclePrice),
    oracleExpo: Number(config.oracleExpo),
    circulatingAtoms: supply,
    totalSupplyAtoms: chainAmount(config.totalSupply),
    salePriceAtoms: chainAmount(config.salePrice),
    decimals: Number(config.decimals),
    governedMintPctBps: Number(config.governedMintPctBps),
    pathAReady: config.rmAllowanceOpen,
    pathBActivated: config.rmGovOpen,
  });
  const input = {
    status,
    now,
    saleEnd: Number(chainAmount(config.saleEnd)),
    soldTokens: chainAmount(config.soldTokens),
    saleTokens: chainAmount(config.saleTokens),
    convertDone: config.convertDone,
    claimed: deposit?.claimed ?? false,
    depositAtoms,
    lpTokenAtoms,
    saleUsdcAtoms,
    wsolAtoms,
    lpUsdcShareBps: Number(config.lpUsdcShareBps),
    salePrice: chainAmount(config.salePrice),
    decimals: Number(config.decimals),
  };
  const offers = postSaleOffers(input);
  const chain: PostSaleChain = {
    cranker: wallet ?? PublicKey.default,
    mint,
    usdcMint: config.usdcMint,
    ctokenMint: config.ctokenMint,
    saleUsdcVault: config.saleUsdcVault,
    saleTokenVault: config.saleTokenVault,
    lpTokenVault: config.lpTokenVault,
    treasuryUsdc: config.treasuryUsdc,
    poolVaultA: vaults?.vaultA ?? SystemProgram.programId,
    poolVaultB: vaults?.vaultB ?? SystemProgram.programId,
    nativeVault: nativeVault ?? SystemProgram.programId,
    escrow: config.escrow,
    escrowVault: escrow?.vault ?? SystemProgram.programId,
    vesting: config.vesting,
    venue,
    ...input,
    wsolAtaExists: wsolData != null,
    lpSignerLamports: lpLamports,
    poolsReady: venue === "raydium" || (vaults != null && nativeVault != null),
  };

  return { offers, note: postSaleNote(status, offers), chain, ...backing };
}

function isSet(key: PublicKey): boolean {
  return !key.equals(SystemProgram.programId);
}
