export function revealObserver(reveals: NodeListOf<Element>, reduce: boolean) {
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach((element) => element.classList.add("is-visible"));
    return null;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -5% 0px" },
  );
  reveals.forEach((element) => observer.observe(element));
  return observer;
}

/** Read the hero scroll progress before any style write in the same frame. */
export function readHeroProgress(reduce: boolean): number | null {
  if (reduce) return null;
  const hero = document.querySelector(".home-hero");
  if (!hero) return null;
  const bounds = hero.getBoundingClientRect();
  return Math.max(0, Math.min(1, -bounds.top / Math.max(1, bounds.height)));
}

export function writeHeroProgress(root: HTMLElement, progress: number | null) {
  if (progress == null) return;
  root.style.setProperty("--rebrand-hero-shift", `${progress * 28}px`);
}

export function moveHero(hero: HTMLElement | null, depth: HTMLElement | null, event: PointerEvent) {
  if (!hero || !depth) return;
  const bounds = hero.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 18;
  const y = ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 14;
  depth.style.setProperty("--hero-x", `${x.toFixed(2)}px`);
  depth.style.setProperty("--hero-y", `${y.toFixed(2)}px`);
}

function applyWaterfallStage(visual: HTMLElement, steps: HTMLElement[], next: number) {
  visual.dataset.stage = String(next);
  steps.forEach((step, index) => step.classList.toggle("is-active", index === next));
  visual.querySelectorAll(".wf-stage").forEach((stage, index) => {
    stage.classList.toggle("is-active", index === next);
  });
}

/** Track the lifecycle step in view. No layout reads on scroll. */
export function watchWaterfall(reduce: boolean) {
  const visual = document.querySelector<HTMLElement>("[data-waterfall-visual]");
  const steps = [...document.querySelectorAll<HTMLElement>("[data-wf-step]")];
  if (!visual || steps.length === 0) return null;
  if (reduce || !("IntersectionObserver" in window)) {
    applyWaterfallStage(visual, steps, 0);
    return null;
  }

  const ratios = new Map<Element, number>();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) ratios.set(entry.target, entry.intersectionRatio);
        else ratios.delete(entry.target);
      });
      let next = 0;
      let best = -1;
      steps.forEach((step, index) => {
        const ratio = ratios.get(step) ?? -1;
        if (ratio > best) {
          best = ratio;
          next = index;
        }
      });
      if (best >= 0) applyWaterfallStage(visual, steps, next);
    },
    { rootMargin: "-42% 0px -48% 0px", threshold: [0, 0.5, 1] },
  );
  steps.forEach((step) => observer.observe(step));
  return observer;
}
