import { CoinSection } from "@/app/coins/[mint]/coin-section";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { formatUsd, formatUnix } from "@/lib/catalog/format";
import type { ChartPoint } from "@/lib/catalog/types";

const WIDTH = 640;
const HEIGHT = 200;
const PAD = 16;

export function ChartsPanel({ points }: { points: ChartPoint[] }) {
  return (
    <CoinSection title="Charts" lede="Price and volume from the indexer price_history series. Sample points until the backend is live.">
      {points.length === 0 ? (
        <CatalogEmpty title="No price history" body="Charts fill after the first indexed trades or sale prints." />
      ) : (
        <>
          <PriceVolumeChart points={points} />
          <div className="coin-table-wrap">
            <table className="coin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Price</th>
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point) => (
                  <tr key={point.t}>
                    <td>{formatUnix(point.t)}</td>
                    <td>{formatUsd(point.priceUsd)}</td>
                    <td>{formatUsd(point.volumeUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CoinSection>
  );
}

function PriceVolumeChart({ points }: { points: ChartPoint[] }) {
  const maxPrice = Math.max(...points.map((point) => point.priceUsd), 0.01);
  const maxVolume = Math.max(...points.map((point) => point.volumeUsd), 1);
  const innerW = WIDTH - PAD * 2;
  const priceH = 120;
  const volumeH = 44;
  const gap = points.length > 1 ? innerW / (points.length - 1) : 0;
  const barW = Math.max(8, innerW / points.length - 8);

  const line = points
    .map((point, index) => {
      const x = PAD + index * gap;
      const y = PAD + (1 - point.priceUsd / maxPrice) * priceH;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg className="coin-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Price and volume">
      <path d={line} className="coin-chart-line" />
      {points.map((point, index) => {
        const x = PAD + index * gap - barW / 2;
        const h = (point.volumeUsd / maxVolume) * volumeH;
        return <rect key={point.t} className="coin-chart-bar" x={x} y={HEIGHT - PAD - h} width={barW} height={h} />;
      })}
    </svg>
  );
}
