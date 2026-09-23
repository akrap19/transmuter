"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { moveHero, revealObserver, updateHeroShift, updateWaterfall } from "@/components/brand/brand-motion-effects";

export function BrandMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const header = document.querySelector("[data-header]");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveals = document.querySelectorAll(".reveal");
    const observer = revealObserver(reveals, reduce);
    const onScroll = () => {
      const max = root.scrollHeight - window.innerHeight;
      root.style.setProperty("--progress", max > 0 ? String(Math.min(1, window.scrollY / max)) : "0");
      header?.classList.toggle("scrolled", window.scrollY > 24);
      updateHeroShift(root, reduce);
      updateWaterfall();
    };
    const onPointer = (event: PointerEvent) => {
      root.style.setProperty("--mouse-x", `${event.clientX}px`);
      root.style.setProperty("--mouse-y", `${event.clientY}px`);
    };
    const hero = document.querySelector<HTMLElement>(".home-hero");
    const depth = document.querySelector<HTMLElement>(".hero-depth");
    const onHeroMove = (event: PointerEvent) => moveHero(hero, depth, event);
    const onHeroLeave = () => {
      depth?.style.setProperty("--hero-x", "0px");
      depth?.style.setProperty("--hero-y", "0px");
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    if (window.matchMedia("(pointer:fine)").matches) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      hero?.addEventListener("pointermove", onHeroMove, { passive: true });
      hero?.addEventListener("pointerleave", onHeroLeave, { passive: true });
    }

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onPointer);
      hero?.removeEventListener("pointermove", onHeroMove);
      hero?.removeEventListener("pointerleave", onHeroLeave);
    };
  }, [pathname]);

  return (
    <>
      <div aria-hidden className="page-noise" />
      <div aria-hidden className="cursor-glow" />
      <div aria-hidden className="scroll-progress">
        <span />
      </div>
    </>
  );
}

