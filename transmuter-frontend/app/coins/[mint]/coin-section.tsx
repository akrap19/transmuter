"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

type CoinSectionProps = {
  id?: string;
  title: string;
  lede?: ReactNode;
  headerAction?: ReactNode;
  children?: ReactNode;
};

export function CoinSection({ id, title, lede, headerAction, children }: CoinSectionProps) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const toggle = () => setOpen((value) => !value);

  return (
    <section className="coin-section" id={id}>
      <div className="coin-section-head">
        <h2>
          <button type="button" className="coin-fold-toggle" aria-expanded={open} aria-controls={bodyId} onClick={toggle}>
            {title}
          </button>
        </h2>
        <div className="coin-fold-end">
          {headerAction ? <div className="coin-section-action">{headerAction}</div> : null}
          <button
            type="button"
            className="coin-fold-chevron-btn"
            aria-expanded={open}
            aria-controls={bodyId}
            aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
            onClick={toggle}
          >
            <ChevronDown aria-hidden className={open ? "coin-fold-chevron is-open" : "coin-fold-chevron"} size={32} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <div id={bodyId} className={open ? "coin-fold-body is-open" : "coin-fold-body"} inert={!open}>
        <div className="coin-fold-inner">
          {lede ? <p className="coin-lede">{lede}</p> : null}
          {children}
        </div>
      </div>
    </section>
  );
}
