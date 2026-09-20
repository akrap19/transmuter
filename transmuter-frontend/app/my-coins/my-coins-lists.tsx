import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { CoinTable } from "@/components/catalog/coin-table";
import { formatAmount } from "@/lib/catalog/format";
import { listCreated, listHeld } from "@/lib/catalog/client";
import type { TokenAccountBalance } from "@/lib/catalog/types";

type MyCoinsListsProps = {
  wallet: string;
  accounts?: TokenAccountBalance[];
};

export function MyCoinsLists({ wallet, accounts }: MyCoinsListsProps) {
  const created = listCreated(wallet);
  const held = listHeld(wallet, accounts);

  return (
    <>
      <section className="catalog-section">
        <h2>Created</h2>
        <p>Factory registry entries whose creator is this wallet.</p>
        {created.length === 0 ? (
          <CatalogEmpty title="No created launches" body="Launches you deploy will land here, including VOIDED sales." />
        ) : (
          <CoinTable items={created} />
        )}
      </section>
      <section className="catalog-section">
        <h2>Held</h2>
        <p>Token accounts intersected with known EOL mints.</p>
        {held.length === 0 ? (
          <CatalogEmpty title="No holdings" body="Balances on indexed Transmuter mints will show here." />
        ) : (
          <CoinTable
            items={held}
            extraLabel="Amount"
            extra={(item) => <span className="catalog-extra">{formatAmount(item.amount)}</span>}
          />
        )}
      </section>
    </>
  );
}
