import type { Metadata } from "next";
import "@/app/brand/docs.css";
import { DocsContent } from "@/app/docs/docs-content";
import { DocsMobileNav } from "@/app/docs/docs-mobile-nav";
import { DocsSidebar } from "@/app/docs/docs-sidebar";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { routes } from "@/lib/routes";
import { contentUpdatedLabel } from "@/lib/seo/constants";
import { docsPageGraph } from "@/lib/seo/json-ld";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";

const docsHeadline = "How Transmuter works";
const docsTitle = "How Transmuter works: reserves, escrow, fees and end of life";
const docsDescription =
  "How Transmuter works: token types, reserve assets, launches, sales, escrow, fees, Mint to Scale, what happens when a project stops, and governance.";

export const metadata: Metadata = marketingPageMetadata({
  path: routes.docs,
  title: docsTitle,
  description: docsDescription,
  absoluteTitle: true,
  image: null,
});

export default function DocsPage() {
  return (
    <main className="docs-page">
      <JsonLdScript
        data={docsPageGraph({
          name: docsTitle,
          description: docsDescription,
          headline: docsHeadline,
        })}
      />
      <section className="subhero section-shell docs-hero">
        <p className="eyebrow">DOCUMENTATION</p>
        <h1>{docsHeadline}</h1>
        <p className="lede">
          Everything below will be enforced by contract, not promised. Short on words, precise on numbers.
        </p>
        <p className="docs-note">All figures describe the current design and may change before launch.</p>
        <p className="docs-updated">{`Last updated: ${contentUpdatedLabel}`}</p>
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
    </main>
  );
}
