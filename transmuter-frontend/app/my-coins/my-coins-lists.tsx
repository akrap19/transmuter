import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { CoinTable } from "@/components/catalog/coin-table";
import { formatAmount } from "@/lib/catalog/format";
import type { CoinListItem, HeldCoin } from "@/lib/catalog/types";

type MyCoinsListsProps = {
  created: CoinListItem[];
  held: HeldCoin[];
};

export function MyCoinsLists({ created, held }: MyCoinsListsProps) {
  return (
    <>
      <section className="coin-section">
        <h2>Created</h2>
        <p className="coin-lede">Factory registry entries whose creator is this wallet.</p>
        {created.length === 0 ? (
          <CatalogEmpty title="No created launches" body="Launches you deploy will land here, including VOIDED sales." />
        ) : (
          <CoinTable items={created} />
        )}
      </section>
      <section className="coin-section">
        <h2>Held</h2>
        <p className="coin-lede">Token accounts intersected with known EOL mints.</p>
        {held.length === 0 ? (
          <CatalogEmpty title="No holdings" body="Balances on indexed Transmuter mints will show here." />
        ) : (
          <CoinTable
            items={held}
            extraLabel="Amount"
            extra={(item) => <span className="coin-extra">{formatAmount(item.amount)}</span>}
          />
        )}
      </section>
    </>
  );
}
