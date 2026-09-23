import type { Metadata } from "next";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { glossaryTerms } from "@/lib/marketing/glossary-data";
import { glossaryPageGraph } from "@/lib/seo/json-ld";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";

const glossaryTitle = "Transmuter glossary: EOL token, cToken, escrow, recovery";
const glossaryDescription =
  "Definitions of the terms used across Transmuter: EOL token, cToken, escrow, contract-owned liquidity, Mint to Scale, recovery and the contingency layer.";

export const metadata: Metadata = marketingPageMetadata({
  path: "/glossary",
  title: glossaryTitle,
  description: glossaryDescription,
  absoluteTitle: true,
});

export default function GlossaryPage() {
  return (
    <main>
      <JsonLdScript data={glossaryPageGraph({ name: glossaryTitle, description: glossaryDescription }, glossaryTerms)} />
      <section className="subhero section-shell">
        <p className="eyebrow">GLOSSARY</p>
        <h1>Glossary</h1>
        <p>One noun per object. Definitions used across the site, docs and app.</p>
      </section>
      <section className="glossary-section section-shell">
        {glossaryTerms.map((term) => (
          <article id={term.id} key={term.id}>
            <h2>{term.title}</h2>
            <p>{term.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
