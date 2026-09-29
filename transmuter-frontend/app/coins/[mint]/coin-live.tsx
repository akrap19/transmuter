"use client";

import { ChartsPanel } from "@/app/coins/[mint]/charts-panel";
import { EscrowPanel } from "@/app/coins/[mint]/escrow-panel";
import { GovernancePanel } from "@/app/coins/[mint]/governance-panel";
import { OverviewPanel } from "@/app/coins/[mint]/overview-panel";
import { PostSalePanel } from "@/app/coins/[mint]/post-sale-panel";
import { RedeemPanel } from "@/app/coins/[mint]/redeem-panel";
import { SalePanel } from "@/app/coins/[mint]/sale-panel";
import { StakePanel } from "@/app/coins/[mint]/stake-panel";
import { TradePanel } from "@/app/coins/[mint]/trade-panel";
import { TreasuryPanel } from "@/app/coins/[mint]/treasury-panel";
import { VestingPanel } from "@/app/coins/[mint]/vesting-panel";
import { useChainHolder } from "@/app/coins/[mint]/use-chain-holder";
import { useChainPostSale } from "@/app/coins/[mint]/use-chain-post-sale";
import { useChainSale } from "@/app/coins/[mint]/use-chain-sale";
import { mergeBacking, mergeHolder, mergeLiveDetail } from "@/lib/catalog/load-catalog";
import type { CoinDetail } from "@/lib/catalog/types";

export function CoinLive({ detail }: { detail: CoinDetail }) {
  const { live, reload } = useChainSale(detail.mint);
  const { view, reload: reloadPost } = useChainPostSale(detail.mint);
  const { view: holder, reload: reloadHolder } = useChainHolder(detail.mint);
  const refresh = () => {
    reload();
    reloadPost();
    reloadHolder();
  };
  const coin = mergeHolder(mergeBacking(mergeLiveDetail(detail, live), view), holder);
  const chain = holder?.chain ?? null;
  const offers = holder?.offers ?? { openVote: false, executeVote: false };

  return (
    <>
      <OverviewPanel coin={coin} treasury={view ? "shown" : "pending"} />
      <section className="coin-body section-shell">
        <SalePanel coin={coin} onSaleChange={refresh} />
        <PostSalePanel offers={view?.offers ?? []} note={view?.note ?? null} chain={view?.chain ?? null} onConfirmed={refresh} />
        {view ? <TreasuryPanel coin={coin} /> : null}
        <TradePanel coin={coin} />
        <ChartsPanel points={coin.chart} />
        <StakePanel coin={coin} chain={chain} onConfirmed={refresh} />
        <GovernancePanel coin={coin} chain={chain} offers={offers} onConfirmed={refresh} />
        <RedeemPanel coin={coin} chain={chain} onConfirmed={refresh} />
        <VestingPanel coin={coin} chain={chain} now={holder?.asOf ?? 0} onConfirmed={refresh} />
        <EscrowPanel coin={coin} chain={chain} now={holder?.asOf ?? 0} onConfirmed={refresh} />
      </section>
    </>
  );
}
