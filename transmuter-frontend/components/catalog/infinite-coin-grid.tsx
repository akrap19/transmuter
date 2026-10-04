"use client";

import { useEffect, useRef, useState } from "react";
import { loadExplorePage } from "@/app/coins/load-explore-page";
import { CoinGrid } from "@/components/catalog/coin-grid";
import { appendCoinPage, exploreHasMore } from "@/lib/catalog/explore-page";
import type { CatalogSource } from "@/lib/catalog/load-catalog";
import type { CoinListItem, CoinQuery } from "@/lib/catalog/types";

type InfiniteCoinGridProps = {
  items: CoinListItem[];
  total: number;
  query: CoinQuery;
  source: CatalogSource;
};

export function InfiniteCoinGrid({ items, total, query, source }: InfiniteCoinGridProps) {
  const [rows, setRows] = useState(items);
  const [count, setCount] = useState(total);
  const [phase, setPhase] = useState<"idle" | "loading" | "error">("idle");
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const gate = useRef({ rows, count, query, source });
  gate.current = { rows, count, query, source };

  const hasMore = exploreHasMore(rows.length, count) && phase !== "error";

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;

    let cancelled = false;

    async function pull() {
      if (busy.current || cancelled) return;
      const current = gate.current;
      if (!exploreHasMore(current.rows.length, current.count)) return;
      busy.current = true;
      setPhase("loading");
      try {
        const page = await loadExplorePage(current.query, current.rows.length);
        if (cancelled) return;
        if (page.source !== gate.current.source) {
          setPhase("error");
          return;
        }
        const next = appendCoinPage(gate.current.rows, page.result.items);
        if (next.length === gate.current.rows.length) {
          setCount(next.length);
          setPhase("idle");
          return;
        }
        setRows(next);
        setCount(page.result.total);
        setPhase("idle");
      } catch {
        if (!cancelled) setPhase("error");
      } finally {
        busy.current = false;
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void pull();
      },
      { rootMargin: "640px 0px" },
    );
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [hasMore, rows.length]);

  return (
    <>
      <CoinGrid items={rows} query={query} />
      {hasMore ? (
        <div ref={sentinel} className="explore-sentinel" data-explore-sentinel="">
          {phase === "loading" ? (
            <p className="explore-more" aria-live="polite">
              Loading more launches…
            </p>
          ) : null}
        </div>
      ) : null}
      {phase === "error" ? (
        <button type="button" className="explore-more" onClick={() => setPhase("idle")}>
          Couldn’t load more. Try again.
        </button>
      ) : null}
    </>
  );
}
