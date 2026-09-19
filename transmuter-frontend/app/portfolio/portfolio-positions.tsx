import { CoinIdentity } from "@/components/catalog/coin-identity";
import { formatAmount, formatUnix, formatUsd } from "@/lib/catalog/format";
import type { Holding, StakePosition } from "@/lib/catalog/types";
import { PortfolioBlock } from "./portfolio-block";

export function HoldingsTable({ rows }: { rows: Holding[] }) {
  return (
    <PortfolioBlock title="Holdings" empty="No indexed balances for this wallet." rows={rows}>
      <table className="catalog-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Amount</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.mint}>
              <td>
                <CoinIdentity mint={row.mint} name={row.name} symbol={row.symbol} />
              </td>
              <td>{formatAmount(row.amount)}</td>
              <td>{formatUsd(row.valueUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PortfolioBlock>
  );
}

export function StakesTable({ rows }: { rows: StakePosition[] }) {
  return (
    <PortfolioBlock title="Stakes" empty="No staked positions." rows={rows}>
      <table className="catalog-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Staked</th>
            <th>Weight</th>
            <th>Voter lock</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.mint}>
              <td>
                <CoinIdentity mint={row.mint} name={row.name} symbol={row.symbol} />
              </td>
              <td>{formatAmount(row.staked)}</td>
              <td>{formatAmount(row.weight)}</td>
              <td>{row.voterLockedUntil ? `Locked until ${formatUnix(row.voterLockedUntil)}` : "Unlocked"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PortfolioBlock>
  );
}
