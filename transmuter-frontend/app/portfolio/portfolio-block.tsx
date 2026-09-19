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
    <section className="catalog-section">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <CatalogEmpty title={empty} />
      ) : (
        <div className="tbl-scroll catalog-table-wrap">{children}</div>
      )}
    </section>
  );
}
