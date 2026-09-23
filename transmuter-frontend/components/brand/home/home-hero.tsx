import Link from "next/link";
import { routes } from "@/lib/routes";

export function HomeHero() {
  return (
    <section className="hero section-shell home-hero">
      <div aria-hidden className="hero-depth">
        <div className="depth-core" />
        <div className="depth-grid" />
        <div className="depth-orbit orbit-one" />
        <div className="depth-orbit orbit-two" />
        <div className="depth-orbit orbit-three" />
        <div className="depth-pillar pillar-one" />
        <div className="depth-pillar pillar-two" />
      </div>
      <div className="hero-copy reveal">
        <p className="eyebrow hero-kicker">
          <span /> VALUE RECOVERY INFRASTRUCTURE FOR TOKENS <span />
        </p>
        <h1 className="hero-gradient-title">
          <span className="hero-title-line hero-title-first">Your token, </span>
          <span className="hero-title-line hero-title-second">backed from the first block.</span>
        </h1>
        <p className="hero-lede">
          Launch with reserves beneath the token, optional escrow for project runway, and recovery rules defined
          before trading. Backing can grow while the token is active.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href={routes.access}>
            Get early access
          </Link>
          <Link className="button button-ghost" href={routes.docs}>
            Read the docs
          </Link>
        </div>
      </div>
    </section>
  );
}
