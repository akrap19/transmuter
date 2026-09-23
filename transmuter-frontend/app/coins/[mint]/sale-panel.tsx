import { CoinProgress } from "@/app/coins/[mint]/coin-progress";
import { CoinSection } from "@/app/coins/[mint]/coin-section";
import { CoinStats } from "@/app/coins/[mint]/coin-stats";
import { SaleActions } from "@/app/coins/[mint]/sale-actions";
import { formatBps, formatUsd, formatUnix } from "@/lib/catalog/format";
import type { CoinDetail } from "@/lib/catalog/types";

export function SalePanel({ coin }: { coin: CoinDetail }) {
  if (coin.status !== "sale" || !coin.sale) return null;

  const { sale } = coin;
  const width = Math.min(100, Math.max(0, (coin.saleProgressBps ?? 0) / 100));

  return (
    <CoinSection
      title="Sale / Buy"
      lede="Deposit USDC against the remaining cap. Withdraw in full until close. Cap is the sale allocation, not a bonding curve."
    >
      <CoinStats
        items={[
          { label: "Raised", value: formatUsd(sale.raisedUsdc) },
          { label: "Cap", value: formatUsd(sale.capUsdc) },
          { label: "Remaining", value: formatUsd(sale.remainingUsdc) },
          { label: "Closes", value: formatUnix(sale.closesAt) },
        ]}
      />
      <CoinProgress value={width} label="Sale progress" />
      <p className="coin-note">
        {formatBps(coin.saleProgressBps)} filled at {formatUsd(sale.priceUsd)} / token.
        {sale.depositsOpen ? " Deposits open." : " Deposits closed; withdrawals stay open until close."}
      </p>
      <SaleActions mint={coin.mint} status={coin.status} />
    </CoinSection>
  );
}
