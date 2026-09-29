"use client";

import { useEffect, useState } from "react";
import { formatRemaining } from "@/lib/catalog/format";

export function SaleRemaining({ closesAt }: { closesAt: number }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (now == null) return "…";
  return formatRemaining(closesAt, now);
}
