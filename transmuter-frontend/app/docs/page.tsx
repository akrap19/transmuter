import type { Metadata } from "next";
import "@/app/brand/docs.css";
import { DocsContent } from "@/app/docs/docs-content";
import { DocsMobileNav } from "@/app/docs/docs-mobile-nav";
import { DocsSidebar } from "@/app/docs/docs-sidebar";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "How Transmuter works: token types, reserve assets, launches, sales, escrow, fees, Mint to Scale, what happens when a project stops, and governance.",
};

export default function DocsPage() {
  return (
    <div className="docs-page">
      <section className="subhero section-shell docs-hero">
        <p className="eyebrow">DOCUMENTATION</p>
        <h1>How Transmuter works</h1>
        <p className="lede">
          Everything below is enforced by contract, not promised. Short on words, precise on
          numbers.
        </p>
      </section>

      <section className="docs-section section-shell">
        <div className="docs-layout">
          <aside className="docs-sidebar-wrap">
            <DocsSidebar />
          </aside>
          <div className="docs-main">
            <DocsContent />
          </div>
        </div>
      </section>
      <DocsMobileNav />
    </div>
  );
}
