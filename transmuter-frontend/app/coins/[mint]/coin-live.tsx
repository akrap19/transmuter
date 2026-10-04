"use client";

import { ChartsPanel } from "@/app/coins/[mint]/charts-panel";
import { EscrowPanel } from "@/app/coins/[mint]/escrow-panel";
import { GovernancePanel } from "@/app/coins/[mint]/governance-panel";
import { OverviewPanel } from "@/app/coins/[mint]/overview-panel";
import { PostSalePanel } from "@/app/coins/[mint]/post-sale-panel";
import { RedeemPanel } from "@/app/coins/[mint]/redeem-panel";
import { SaleFinalize } from "@/app/coins/[mint]/sale-finalize";
import { SalePanel } from "@/app/coins/[mint]/sale-panel";
import { StakePanel } from "@/app/coins/[mint]/stake-panel";
import { TradePanel } from "@/app/coins/[mint]/trade-panel";
import { TreasuryLoading } from "@/app/coins/[mint]/treasury-loading";
import { TreasuryPanel } from "@/app/coins/[mint]/treasury-panel";
import { VestingPanel } from "@/app/coins/[mint]/vesting-panel";
import { useChainHolder } from "@/app/coins/[mint]/use-chain-holder";
import { useChainPostSale } from "@/app/coins/[mint]/use-chain-post-sale";
import { useChainSale } from "@/app/coins/[mint]/use-chain-sale";
import { treasurySectionState } from "@/lib/catalog/chain-read";
import { mergeBacking, mergeHolder, mergeLiveDetail } from "@/lib/catalog/load-catalog";
import type { CoinDetail } from "@/lib/catalog/types";

export function CoinLive({ detail, backHref }: { detail: CoinDetail; backHref: string }) {
  const { live, depositKnown, reload } = useChainSale(detail.mint);
  const { view, settled, reload: reloadPost } = useChainPostSale(detail.mint);
  const { view: holder, reload: reloadHolder } = useChainHolder(detail.mint);
  const refresh = () => {
    reload();
    reloadPost();
    reloadHolder();
  };
  const coin = mergeHolder(mergeBacking(mergeLiveDetail(detail, live), view), holder);
  const treasuryPhase = treasurySectionState(coin.status, settled, view != null);
  const chain = holder?.chain ?? null;
  const offers = holder?.offers ?? { openVote: false, executeVote: false };
  const postOffers = (view?.offers ?? []).filter((kind) => kind !== "finalize");
  const canFinalize = (view?.offers ?? []).includes("finalize") && view?.chain != null;
  const finalizeSlot = canFinalize ? <SaleFinalize chain={view!.chain!} onConfirmed={refresh} /> : null;
  const postNote = coin.status === "sale" ? null : (view?.note ?? null);

  return (
    <>
      <OverviewPanel coin={coin} treasury={view ? "shown" : "pending"} backHref={backHref} />
      <section className="coin-body section-shell">
        <SalePanel coin={coin} depositKnown={depositKnown} finalize={finalizeSlot} onSaleChange={refresh} />
        <PostSalePanel offers={postOffers} note={postNote} chain={view?.chain ?? null} onConfirmed={refresh} />
        {treasuryPhase === "loading" ? <TreasuryLoading backing={coin.backing} /> : null}
        {treasuryPhase === "ready" ? <TreasuryPanel coin={coin} /> : null}
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
