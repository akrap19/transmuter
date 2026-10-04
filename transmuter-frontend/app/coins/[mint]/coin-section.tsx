import type { ReactNode } from "react";

type CoinSectionProps = {
  id?: string;
  title: string;
  lede?: ReactNode;
  headerAction?: ReactNode;
  children?: ReactNode;
};

export function CoinSection({ id, title, lede, headerAction, children }: CoinSectionProps) {
  return (
    <section className="coin-section" id={id}>
      <div className="coin-section-head">
        <h2>{title}</h2>
        {headerAction ? <div className="coin-section-action">{headerAction}</div> : null}
      </div>
      {lede ? <p className="coin-lede">{lede}</p> : null}
      {children}
    </section>
  );
}
