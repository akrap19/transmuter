import type { ReactNode } from "react";

type CatalogEmptyProps = {
  title: string;
  body?: string;
  children?: ReactNode;
};

export function CatalogEmpty({ title, body, children }: CatalogEmptyProps) {
  return (
    <div className="catalog-empty">
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
      {children}
    </div>
  );
}
