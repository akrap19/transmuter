import { CoinCrumb } from "@/app/coins/[mint]/coin-crumb";
import { CoinMeta } from "@/app/coins/[mint]/coin-meta";
import { CoinSocials } from "@/app/coins/[mint]/coin-socials";
import { CoinStats } from "@/app/coins/[mint]/coin-stats";
import { CoinAvatar } from "@/components/catalog/coin-avatar";
import { CoinStatus } from "@/components/catalog/coin-status";
import { formatBps, formatUsd } from "@/lib/catalog/format";
import { explorerAddressUrl, shortenAddress } from "@/lib/solana/config";
import type { CoinDetail } from "@/lib/catalog/types";

export function OverviewPanel({
  coin,
  treasury = "shown",
  backHref,
}: {
  coin: CoinDetail;
  treasury?: "shown" | "pending";
  backHref: string;
}) {
  return (
    <section className="subhero section-shell coin-hero">
      <CoinCrumb href={backHref} />
      <div className="coin-hero-id">
        <div className="coin-hero-name">
          <CoinAvatar symbol={coin.symbol} logoUrl={coin.logoUrl} />
          <div className="coin-hero-copy">
            <div className="coin-hero-title">
              <h1>{coin.name}</h1>
              <CoinStatus status={coin.status} />
            </div>
            <span className="coin-hero-symbol">${coin.symbol}</span>
          </div>
        </div>
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
          { label: "Treasury (incl. USDC)", value: treasury === "pending" ? "—" : formatUsd(coin.treasury.backingValueUsd) },
          { label: "Unconverted USDC", value: treasury === "pending" ? "—" : formatUsd(coin.treasury.unconvertedUsdc) },
          { label: "Holders", value: coin.holderCount },
          {
            label: "Mint",
            value: (
              <a href={explorerAddressUrl(coin.mint)} target="_blank" rel="noopener noreferrer">
                Explorer
              </a>
            ),
          },
          {
            label: "Creator",
            value: (
              <a
                href={explorerAddressUrl(coin.creator)}
                target="_blank"
                rel="noopener noreferrer"
                title={coin.creator}
              >
                {shortenAddress(coin.creator)}
              </a>
            ),
          },
          { label: "Backing", value: coin.backing },
        ]}
      />
    </section>
  );
}
