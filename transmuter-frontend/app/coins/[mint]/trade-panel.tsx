import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { shortenAddress } from "@/lib/solana/config";
import { tradeAvailable } from "@/lib/catalog/trade";
import type { CoinDetail } from "@/lib/catalog/types";

export function TradePanel({ coin }: { coin: CoinDetail }) {
  if (!tradeAvailable(coin.status)) return null;

  const pools = coin.trade?.pools ?? [];
  if (pools.length === 0) {
    return (
      <section className="catalog-section">
        <h2>Trade</h2>
        <CatalogEmpty title="Pools not indexed yet" body="After finalize, EOL/USDC and EOL/SOL links will land here." />
      </section>
    );
  }

  return (
    <section className="catalog-section">
      <h2>Trade</h2>
      <p>Buy or sell through the post-finalize EOL/USDC and EOL/SOL pools. Deep-links open the DEX with this mint selected.</p>
      <div className="catalog-trade-grid">
        {pools.map((pool) => (
          <article key={pool.label}>
            <span>{pool.label}</span>
            <strong>{shortenAddress(pool.pool, 6)}</strong>
            <a className="btn btn-gold" href={pool.href} target="_blank" rel="noopener noreferrer">
              Swap {pool.label === "EOL/USDC" ? "USDC" : "SOL"}
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
