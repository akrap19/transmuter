import { CoinCard } from "@/components/catalog/coin-card";
import type { CoinListItem, CoinQuery } from "@/lib/catalog/types";

type CoinGridProps = {
  items: CoinListItem[];
  query: CoinQuery;
};

export function CoinGrid({ items, query }: CoinGridProps) {
  return (
    <div className="explore-grid">
      {items.map((item) => (
        <CoinCard key={item.mint} item={item} query={query} />
      ))}
    </div>
  );
}
