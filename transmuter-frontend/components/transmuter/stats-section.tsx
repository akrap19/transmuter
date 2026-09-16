"use client";

import { useEffect, useRef } from "react";

type StatItem = {
  value: string;
  label: string;
  source?: string;
  wide?: boolean;
};

const stats: StatItem[] = [
  {
    value: "53%",
    label: "of all tokens ever launched are now dead, and their holders got nothing",
    source: "CoinGecko",
  },
  {
    value: "$2.1T",
    label: "of non-stablecoin crypto has no plan for failure",
    source: "CoinGecko",
  },
  {
    value: "$20B+",
    label: "lost to scams, hacks and rug pulls in 2025 alone",
    source: "Chainalysis",
  },
  {
    value: "#1",
    label: "No protocol has ever built end of life infrastructure. We're first.",
    wide: true,
  },
];

function parseStat(raw: string) {
  const match = raw.match(/^([^\d]*)([\d.]+)(.*)$/);
  if (!match) return null;
  return {
    pre: match[1],
    to: parseFloat(match[2]),
    dec: (match[2].split(".")[1] || "").length,
    suf: match[3],
    raw,
  };
}

function StatValue({ raw }: { raw: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const parsed = parseStat(raw);

  useEffect(() => {
    const el = ref.current;
    if (!el || !parsed) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      el.textContent = parsed.raw;
      return;
    }

    el.textContent = `${parsed.pre}${(0).toFixed(parsed.dec)}${parsed.suf}`;

    const run = () => {
      const duration = 1400;
      const start = performance.now();

      const step = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - (1 - t) ** 3;
        el.textContent = `${parsed.pre}${(parsed.to * eased).toFixed(parsed.dec)}${parsed.suf}`;
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = parsed.raw;
      };

      requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run();
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.6 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [parsed, raw]);

  if (!parsed) return <b>{raw}</b>;

  return <b ref={ref}>{parsed.raw}</b>;
}

export function StatsSection() {
  return (
    <div className="stats">
      <div className="wrap">
        {stats.map((stat) => (
          <div key={stat.value} className={stat.wide ? "stat wide" : "stat"}>
            <StatValue raw={stat.value} />
            <span>{stat.label}</span>
            {stat.source && <span className="src">{stat.source}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
