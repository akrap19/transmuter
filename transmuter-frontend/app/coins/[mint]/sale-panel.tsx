import { CoinProgress } from "@/app/coins/[mint]/coin-progress";
import { CoinSection } from "@/app/coins/[mint]/coin-section";
import { CoinStats } from "@/app/coins/[mint]/coin-stats";
import { SaleActions } from "@/app/coins/[mint]/sale-actions";
import { SaleLoading } from "@/app/coins/[mint]/sale-loading";
import { SaleRemaining } from "@/app/coins/[mint]/sale-remaining";
import { saleSectionState } from "@/lib/catalog/chain-read";
import { formatBps, formatUsd, formatUnix } from "@/lib/catalog/format";
import type { CoinDetail } from "@/lib/catalog/types";
import type { ReactNode } from "react";

export function SalePanel({
  coin,
  depositKnown,
  finalize,
  onSaleChange,
}: {
  coin: CoinDetail;
  depositKnown: boolean;
  finalize?: ReactNode;
  onSaleChange: () => void;
}) {
  const phase = saleSectionState(coin.status, coin.sale != null);
  if (phase === "loading") return <SaleLoading />;
  if (phase === "hidden" || !coin.sale) return null;

  const { sale } = coin;
  const width = Math.min(100, Math.max(0, (coin.saleProgressBps ?? 0) / 100));

  return (
    <CoinSection
      title="Sale / Buy"
      lede="Deposit USDC against the remaining cap. Withdraw in full until close. Cap is the sale allocation, not a bonding curve."
      headerAction={finalize}
    >
      <CoinStats
        items={[
          { label: "Raised", value: formatUsd(sale.raisedUsdc) },
          { label: "Cap", value: formatUsd(sale.capUsdc) },
          { label: "Remaining", value: formatUsd(sale.remainingUsdc) },
          { label: "Time left", value: <SaleRemaining closesAt={sale.closesAt} /> },
          { label: "Closes", value: formatUnix(sale.closesAt) },
          { label: "Your deposit", value: depositKnown ? formatUsd(sale.myDepositUsdc) : "…" },
        ]}
      />
      <CoinProgress value={width} label="Sale progress" />
      <p className="coin-note">
        {formatBps(coin.saleProgressBps)} filled at {formatUsd(sale.priceUsd)} / token.
        {sale.depositsOpen ? " Deposits open." : " Deposits closed; withdrawals stay open until close."}
      </p>
      <SaleActions mint={coin.mint} sale={sale} status={coin.status} depositKnown={depositKnown} onConfirmed={onSaleChange} />
    </CoinSection>
  );
}
