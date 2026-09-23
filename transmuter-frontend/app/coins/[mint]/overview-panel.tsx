import Link from "next/link";
import { CoinMeta } from "@/app/coins/[mint]/coin-meta";
import { CoinSocials } from "@/app/coins/[mint]/coin-socials";
import { CoinStats } from "@/app/coins/[mint]/coin-stats";
import { CoinAvatar } from "@/components/catalog/coin-avatar";
import { CoinStatus } from "@/components/catalog/coin-status";
import { formatBps, formatUsd } from "@/lib/catalog/format";
import { explorerAddressUrl } from "@/lib/solana/config";
import { routes } from "@/lib/routes";
import type { CoinDetail } from "@/lib/catalog/types";

export function OverviewPanel({ coin }: { coin: CoinDetail }) {
  return (
    <section className="subhero section-shell coin-hero">
      <Link href={routes.coins} className="coin-back">
        All coins
      </Link>
      <p className="eyebrow">EXPLORE · TOKEN</p>
      <div className="coin-hero-id">
        <div className="coin-hero-name">
          <CoinAvatar symbol={coin.symbol} logoUrl={coin.logoUrl} />
          <div className="coin-hero-copy">
            <h1>{coin.name}</h1>
            <span className="coin-hero-symbol">${coin.symbol}</span>
          </div>
        </div>
        <CoinStatus status={coin.status} />
      </div>
      <p>{coin.description || `${coin.name} on Transmuter — Factory-registered EOL launch.`}</p>
      <CoinSocials socials={coin.socials} />
      <CoinStats
        items={[
          { label: "Price", value: formatUsd(coin.priceUsd) },
          { label: "Market cap", value: formatUsd(coin.marketCapUsd) },
          { label: "Backing ratio", value: formatBps(coin.backingRatioBps) },
          { label: "Sale progress", value: formatBps(coin.saleProgressBps) },
        ]}
      />
      <CoinMeta
        items={[
          { label: "Status", value: <CoinStatus status={coin.status} /> },
          { label: "Treasury (incl. USDC)", value: formatUsd(coin.treasury.backingValueUsd) },
          { label: "Unconverted USDC", value: formatUsd(coin.treasury.unconvertedUsdc) },
          { label: "Holders", value: coin.holderCount },
          {
            label: "Mint",
            value: (
              <a href={explorerAddressUrl(coin.mint)} target="_blank" rel="noopener noreferrer">
                Explorer
              </a>
            ),
          },
          { label: "Backing", value: coin.backing },
        ]}
      />
    </section>
  );
}
