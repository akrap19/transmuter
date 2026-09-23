import type { ReactNode } from "react";

export type CoinStatItem = {
  label: string;
  value: ReactNode;
};

export function CoinStats({ items }: { items: CoinStatItem[] }) {
  return (
    <div className="coin-stats">
      {items.map((item) => (
        <article key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}
