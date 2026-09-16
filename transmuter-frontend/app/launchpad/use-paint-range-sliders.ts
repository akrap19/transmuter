"use client";

import { useEffect } from "react";

function paintSlider(el: HTMLInputElement) {
  if (el.disabled) return;
  const min = parseFloat(el.min);
  const max = parseFloat(el.max);
  const val = parseFloat(el.value);
  const frac = max > min ? Math.min(1, Math.max(0, (val - min) / (max - min))) : 0;
  const thumb = 18;
  const w = el.getBoundingClientRect().width;
  if (!w) {
    el.style.backgroundSize = "0px 100%";
    return;
  }
  const fillPx = thumb / 2 + frac * (w - thumb);
  el.style.backgroundSize = `${fillPx.toFixed(2)}px 100%`;
}

function paintAllSliders(root: ParentNode = document) {
  root.querySelectorAll<HTMLInputElement>("input[type=range]").forEach(paintSlider);
}

export function usePaintRangeSliders(active = true, repaintKey?: string | number) {
  useEffect(() => {
    if (!active) return;

    const onInput = (e: Event) => {
      const target = e.target;
      if (target instanceof HTMLInputElement && target.matches("input[type=range]")) {
        paintSlider(target);
      }
    };

    const repaint = () => paintAllSliders();
    const frame = requestAnimationFrame(repaint);

    document.addEventListener("input", onInput, true);
    window.addEventListener("resize", repaint);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("input", onInput, true);
      window.removeEventListener("resize", repaint);
    };
  }, [active, repaintKey]);
}
