import type { ReactNode } from "react";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";

type PortfolioBlockProps = {
  title: string;
  empty: string;
  rows: unknown[];
  children: ReactNode;
};

export function PortfolioBlock({ title, empty, rows, children }: PortfolioBlockProps) {
  return (
    <section className="coin-section">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <CatalogEmpty title={empty} />
      ) : (
        <div className="coin-table-wrap">{children}</div>
      )}
    </section>
  );
}
