"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

const VISIBLE_ROWS = 6;

export function ScrollRows({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<number>();

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const measure = () => {
      const items = Array.from(root.children) as HTMLElement[];
      if (items.length <= VISIBLE_ROWS) {
        setMaxHeight(undefined);
        return;
      }
      const edge = items[VISIBLE_ROWS - 1];
      const next = edge.offsetTop + edge.offsetHeight;
      setMaxHeight((current) => (current === next ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    for (const child of root.children) observer.observe(child);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div
      ref={ref}
      className={className ? `coin-rows-scroll ${className}` : "coin-rows-scroll"}
      style={maxHeight == null ? undefined : { maxHeight }}
    >
      {children}
    </div>
  );
}
