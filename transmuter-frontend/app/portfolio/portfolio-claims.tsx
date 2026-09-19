import Link from "next/link";
import { CoinIdentity } from "@/components/catalog/coin-identity";
import { formatAmount, formatStatus, formatUnix } from "@/lib/catalog/format";
import { coinPath } from "@/lib/routes";
import type { Claimable, OpenVote } from "@/lib/catalog/types";
import { PortfolioBlock } from "./portfolio-block";

export function ClaimablesTable({ rows }: { rows: Claimable[] }) {
  return (
    <PortfolioBlock title="Claimables" empty="Nothing to claim." rows={rows}>
      <table className="catalog-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Kind</th>
            <th>Amount</th>
            <th>Asset</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.mint}-${row.kind}`}>
              <td>
                <CoinIdentity mint={row.mint} name={row.name} symbol={row.symbol} />
              </td>
              <td>{formatStatus(row.kind)}</td>
              <td>{formatAmount(row.amount)}</td>
              <td>{row.asset}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PortfolioBlock>
  );
}

export function VotesTable({ rows }: { rows: OpenVote[] }) {
  return (
    <PortfolioBlock title="Open votes" empty="No open votes." rows={rows}>
      <table className="catalog-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Proposal</th>
            <th>Tally</th>
            <th>Closes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.mint}-${row.kind}`}>
              <td>
                <CoinIdentity mint={row.mint} name={row.name} symbol={row.symbol} />
              </td>
              <td>
                <Link href={coinPath(row.mint)}>{formatStatus(row.kind)}</Link>
              </td>
              <td>
                Yes {formatAmount(row.yesWeight)} / No {formatAmount(row.noWeight)}
              </td>
              <td>{formatUnix(row.closesAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PortfolioBlock>
  );
}
