import { CoinSection } from "@/app/coins/[mint]/coin-section";
import { ScrollRows } from "@/app/coins/[mint]/scroll-rows";
import { shownTradePools } from "@/lib/catalog/trade";
import { shortenAddress } from "@/lib/solana/config";
import type { CoinDetail } from "@/lib/catalog/types";

export function TradePanel({ coin }: { coin: CoinDetail }) {
  const pools = shownTradePools(coin.status, coin.trade?.pools);
  if (pools.length === 0) return null;

  return (
    <CoinSection
      title="Trade"
      lede="Buy or sell through the post-finalize EOL/USDC and EOL/SOL pools. Deep-links open the DEX with this mint selected."
    >
      <ScrollRows className="coin-trade">
        {pools.map((pool) => (
          <article key={pool.label}>
            <span>{pool.label}</span>
            <strong>{shortenAddress(pool.pool, 6)}</strong>
            <a className="button button-primary" href={pool.href} target="_blank" rel="noopener noreferrer">
              Swap {pool.label === "EOL/USDC" ? "USDC" : "SOL"}
            </a>
          </article>
        ))}
      </ScrollRows>
    </CoinSection>
  );
}
