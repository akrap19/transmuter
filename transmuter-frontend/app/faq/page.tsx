import type { Metadata } from "next";
import { FaqList } from "@/components/brand/faq-list";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { faqGroups } from "@/lib/marketing/faq-data";
import { faqPageGraph, marketingPageGraph } from "@/lib/seo/json-ld";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";

const faqTitle = "Transmuter FAQ: reserves, escrow, governance and recovery";
const faqDescription =
  "How tokens launched on Transmuter are backed, who can move funds, how escrow and governance work, what recovery pays, and where the system stops.";

export const metadata: Metadata = marketingPageMetadata({
  path: "/faq",
  title: faqTitle,
  description: faqDescription,
  absoluteTitle: true,
});

export default function FaqPage() {
  return (
    <main>
      <JsonLdScript
        data={marketingPageGraph({
          path: "/faq",
          name: faqTitle,
          description: faqDescription,
          breadcrumbs: [
            { name: "Transmuter", path: "/" },
            { name: "FAQ", path: "/faq" },
          ],
        })}
      />
      <JsonLdScript data={faqPageGraph(faqGroups)} />
      <section className="subhero section-shell">
        <p className="eyebrow">FAQ</p>
        <h1>Questions, answered directly.</h1>
        <p>Mechanics, control, cost, governance and recovery.</p>
      </section>
      <section className="faq-section section-shell full-faq">
        {faqGroups.map((group) => (
          <div className="faq-group" key={group.id}>
            <h2 id={group.id}>{group.title}</h2>
            <FaqList items={group.items} />
          </div>
        ))}
      </section>
    </main>
  );
}
