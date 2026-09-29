import type { PublicKey } from "@solana/web3.js";
import { readEolConfig, readEolDeposit, readFactoryLaunchByMint, type AccountFetcher } from "@/lib/solana/accounts";
import { chainAmount, liveSaleFromChain, type ChainAmount, type LiveSaleView } from "./live-sale";

type FactoryLaunch = {
  status: number;
  targetRaise: ChainAmount;
  salePrice: ChainAmount;
  saleEnd: ChainAmount;
};

type EolConfig = {
  status: number;
  raisedUsdc: ChainAmount;
  salePrice: ChainAmount;
  saleEnd: ChainAmount;
};

type EolDeposit = {
  amount: ChainAmount;
};

export type LiveSaleReaders = {
  launch: AccountFetcher<FactoryLaunch>;
  mintIndex: AccountFetcher<{ launchId: { toString(): string } }>;
  config: AccountFetcher<EolConfig>;
  deposit: AccountFetcher<EolDeposit>;
};

export async function readLiveSale(
  readers: LiveSaleReaders,
  mint: PublicKey,
  depositor: PublicKey | null,
  now: number,
): Promise<LiveSaleView | null> {
  const [launch, config, deposit] = await Promise.all([
    readFactoryLaunchByMint({ launch: readers.launch, mintIndex: readers.mintIndex }, mint),
    readEolConfig(readers.config, mint),
    depositor ? readEolDeposit(readers.deposit, mint, depositor) : Promise.resolve(null),
  ]);
  if (!launch && !config) return null;

  return liveSaleFromChain({
    factoryStatus: launch ? Number(launch.account.status) : null,
    eolStatus: config ? Number(config.account.status) : null,
    targetRaise: launch?.account.targetRaise ?? BigInt(0),
    raisedUsdc: config?.account.raisedUsdc ?? BigInt(0),
    salePrice: config?.account.salePrice ?? launch?.account.salePrice ?? BigInt(0),
    saleEnd: config?.account.saleEnd ?? launch?.account.saleEnd ?? BigInt(0),
    depositAmount: deposit ? chainAmount(deposit.account.amount) : null,
    now,
  });
}
