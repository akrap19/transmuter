import type { ReactNode } from "react";

export type CoinMetaItem = {
  label: string;
  value: ReactNode;
};

export function CoinMeta({ items }: { items: CoinMetaItem[] }) {
  return (
    <dl className="coin-meta">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
