"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const chainCards = [
  {
    tag: "Layer 01 · Launchpad",
    title: "LAUNCHED TOKENS",
    body: "Every token launches with a funded reserve of blue-chip wrappers. Holders can redeem against it at any time. At end of life, a community vote liquidates everything back to holders.",
    last: false,
  },
  {
    tag: "Layer 02 · cTokens",
    title: "cBTC / cSOL",
    body: "Wrappers of BTC and SOL that burn supply on every trade, so backing per token only grows. The reserve asset behind every launch, redeemable for the base asset at any time.",
    last: false,
  },
  {
    tag: "Layer 03 · Gold",
    title: "TOKENIZED GOLD",
    body: "The last resort. Each cToken accumulates its own isolated reserve of tokenized gold, vaulted and audited monthly, verifiable on chain. Never burned, only grown.",
    last: true,
  },
];

export function CollateralChain() {
  const chainRef = useRef<HTMLDivElement>(null);
  const [caught, setCaught] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chain = chainRef.current;

    if (!chain || reduce || !("IntersectionObserver" in window)) {
      queueMicrotask(() => setCaught(true));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCaught(true);
            observer.unobserve(chain);
          }
        });
      },
      { threshold: 0.4 },
    );

    observer.observe(chain);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn("chain", caught && "catch")} ref={chainRef}>
      {chainCards.flatMap((card, index) => {
        const cardNode = (
          <div key={card.title} className={cn("ccard", card.last && "last")}>
            <div className="tag">{card.tag}</div>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </div>
        );

        if (index === chainCards.length - 1) return [cardNode];

        return [
          cardNode,
          <div key={`arrow-${card.title}`} className="chain-arrow">
            ›
            <span className="drop" aria-hidden="true" />
          </div>,
        ];
      })}
    </div>
  );
}
