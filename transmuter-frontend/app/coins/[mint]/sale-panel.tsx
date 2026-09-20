import { SaleActions } from "@/app/coins/[mint]/sale-actions";
import { formatBps, formatUsd, formatUnix } from "@/lib/catalog/format";
import type { CoinDetail } from "@/lib/catalog/types";

export function SalePanel({ coin }: { coin: CoinDetail }) {
  if (coin.status !== "sale" || !coin.sale) return null;

  const { sale } = coin;
  const width = Math.min(100, Math.max(0, (coin.saleProgressBps ?? 0) / 100));

  return (
    <section className="catalog-section">
      <h2>Sale / Buy</h2>
      <p>Deposit USDC against the remaining cap. Withdraw in full until close. Cap is the sale allocation, not a bonding curve.</p>
      <div className="catalog-stats">
        <article>
          <span>Raised</span>
          <strong>{formatUsd(sale.raisedUsdc)}</strong>
        </article>
        <article>
          <span>Cap</span>
          <strong>{formatUsd(sale.capUsdc)}</strong>
        </article>
        <article>
          <span>Remaining</span>
          <strong>{formatUsd(sale.remainingUsdc)}</strong>
        </article>
        <article>
          <span>Closes</span>
          <strong>{formatUnix(sale.closesAt)}</strong>
        </article>
      </div>
      <div className="catalog-progress" role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100} aria-label="Sale progress">
        <i style={{ width: `${width}%` }} />
      </div>
      <p className="catalog-muted">
        {formatBps(coin.saleProgressBps)} filled at {formatUsd(sale.priceUsd)} / token.
        {sale.depositsOpen ? " Deposits open." : " Deposits closed; withdrawals stay open until close."}
      </p>
      <SaleActions mint={coin.mint} status={coin.status} />
    </section>
  );
}
