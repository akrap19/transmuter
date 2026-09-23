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

export function updateHeroShift(root: HTMLElement, reduce: boolean) {
  const hero = document.querySelector(".home-hero");
  if (!hero || reduce) return;
  const bounds = hero.getBoundingClientRect();
  const progress = Math.max(0, Math.min(1, -bounds.top / Math.max(1, bounds.height)));
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

export function updateWaterfall() {
  const visual = document.querySelector<HTMLElement>("[data-waterfall-visual]");
  const steps = [...document.querySelectorAll<HTMLElement>("[data-wf-step]")];
  if (!visual || steps.length === 0) return;

  const midpoint = window.innerHeight * 0.45;
  let next = 0;
  let best = Infinity;
  steps.forEach((step, index) => {
    const bounds = step.getBoundingClientRect();
    const distance = Math.abs(bounds.top + bounds.height / 2 - midpoint);
    if (distance < best) {
      best = distance;
      next = index;
    }
  });

  visual.dataset.stage = String(next);
  steps.forEach((step, index) => step.classList.toggle("is-active", index === next));
  visual.querySelectorAll(".wf-stage").forEach((stage, index) => {
    stage.classList.toggle("is-active", index === next);
  });
}
