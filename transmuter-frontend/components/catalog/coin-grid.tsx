import { CoinCard } from "@/components/catalog/coin-card";
import type { CoinListItem } from "@/lib/catalog/types";

type CoinGridProps = {
  items: CoinListItem[];
};

export function CoinGrid({ items }: CoinGridProps) {
  return (
    <div className="explore-grid">
      {items.map((item) => (
        <CoinCard key={item.mint} item={item} />
      ))}
    </div>
  );
}
