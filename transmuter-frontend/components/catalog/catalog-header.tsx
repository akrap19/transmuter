import type { ReactNode } from "react";

type CatalogHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
};

export function CatalogHeader({ eyebrow, title, subtitle }: CatalogHeaderProps) {
  return (
    <header className="catalog-header">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">{subtitle}</p>
    </header>
  );
}
