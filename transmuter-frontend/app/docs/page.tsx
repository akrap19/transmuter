import type { Metadata } from "next";
import "@/app/brand/docs.css";
import { DocsContent } from "@/app/docs/docs-content";
import { DocsMobileNav } from "@/app/docs/docs-mobile-nav";
import { DocsSidebar } from "@/app/docs/docs-sidebar";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { routes } from "@/lib/routes";
import { marketingPageGraph } from "@/lib/seo/json-ld";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";

const docsTitle = "How Transmuter works";
const docsDescription =
  "How Transmuter works: token types, reserve assets, launches, sales, escrow, fees, Mint to Scale, what happens when a project stops, and governance.";

export const metadata: Metadata = marketingPageMetadata({
  path: routes.docs,
  title: docsTitle,
  description: docsDescription,
});

export default function DocsPage() {
  return (
    <main className="docs-page">
      <JsonLdScript
        data={marketingPageGraph({
          path: routes.docs,
          name: docsTitle,
          description: docsDescription,
          breadcrumbs: [
            { name: "Transmuter", path: "/" },
            { name: "Docs", path: routes.docs },
          ],
        })}
      />
      <section className="subhero section-shell docs-hero">
        <p className="eyebrow">DOCUMENTATION</p>
        <h1>How Transmuter works</h1>
        <p className="lede">
          Everything below will be enforced by contract, not promised. All figures describe the
          current design and may change before launch. Short on words, precise on numbers.
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
    </main>
  );
}
