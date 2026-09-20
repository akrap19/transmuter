import type { ReactNode } from "react";
import { CoinIdentity } from "@/components/catalog/coin-identity";
import { CoinStatus } from "@/components/catalog/coin-status";
import { formatBps, formatUsd } from "@/lib/catalog/format";
import type { CoinListItem } from "@/lib/catalog/types";

type CoinTableProps<T extends CoinListItem> = {
  items: T[];
  extraLabel?: string;
  extra?: (item: T) => ReactNode;
};

export function CoinTable<T extends CoinListItem>({ items, extra, extraLabel }: CoinTableProps<T>) {
  return (
    <div className="tbl-scroll catalog-table-wrap">
      <table className="catalog-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Status</th>
            <th>Price</th>
            <th>Market cap</th>
            <th>Backing</th>
            <th>Sale</th>
            <th>Holders</th>
            {extra ? <th>{extraLabel}</th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.mint}>
              <td>
                <CoinIdentity mint={item.mint} name={item.name} symbol={item.symbol} logoUrl={item.logoUrl} />
              </td>
              <td>
                <CoinStatus status={item.status} />
              </td>
              <td>{formatUsd(item.priceUsd)}</td>
              <td>{formatUsd(item.marketCapUsd)}</td>
              <td>{item.backing}</td>
              <td>{formatBps(item.saleProgressBps)}</td>
              <td>{item.holderCount}</td>
              {extra ? <td>{extra(item)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
