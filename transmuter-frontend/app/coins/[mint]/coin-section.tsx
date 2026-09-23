import type { ReactNode } from "react";

type CoinSectionProps = {
  id?: string;
  title: string;
  lede?: ReactNode;
  children?: ReactNode;
};

export function CoinSection({ id, title, lede, children }: CoinSectionProps) {
  return (
    <section className="coin-section" id={id}>
      <h2>{title}</h2>
      {lede ? <p className="coin-lede">{lede}</p> : null}
      {children}
    </section>
  );
}
