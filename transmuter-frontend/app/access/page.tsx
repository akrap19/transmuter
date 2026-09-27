import type { Metadata } from "next";
import { BetaForm } from "@/app/access/beta-form";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { marketingPageGraph } from "@/lib/seo/json-ld";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";

const accessTitle = "Join the Transmuter beta";
const accessDescription =
  "Transmuter is opening a closed beta. Tell us who you are and we will reach out when a spot opens.";

export const metadata: Metadata = marketingPageMetadata({
  path: "/access",
  title: accessTitle,
  description: accessDescription,
  absoluteTitle: true,
});

export default function AccessPage() {
  return (
    <main className="subpage">
      <JsonLdScript
        data={marketingPageGraph({
          path: "/access",
          name: accessTitle,
          description: accessDescription,
          breadcrumbs: [
            { name: "Transmuter", path: "/" },
            { name: "Beta testing", path: "/access" },
          ],
        })}
      />
      <section className="subhero access-hero section-shell">
        <p className="eyebrow">BETA TESTING</p>
        <h1>Join the beta.</h1>
        <p>
          This is a working beta for people who want to test the launchpad before it opens. Spots are limited. Tell us
          a little about you and we will reach out when yours opens.
        </p>
      </section>

      <section className="access-section section-shell">
        <BetaForm />
      </section>
    </main>
  );
}
