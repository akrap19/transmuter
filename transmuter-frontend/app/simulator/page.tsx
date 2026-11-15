import type { Metadata } from "next";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { marketingPageGraph } from "@/lib/seo/json-ld";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";
import { routes } from "@/lib/routes";
import { ValueCalculator } from "./value-calculator";

const title = "Simulator";
const description =
  "Configure a token launch and see exactly what holders recover, at any price, at any point in its life.";

export const metadata: Metadata = marketingPageMetadata({
  path: routes.simulator,
  title,
  description,
});

export default function CalculatorPage() {
  return (
    <main>
      <JsonLdScript
        data={marketingPageGraph({
          path: routes.simulator,
          name: title,
          description,
          breadcrumbs: [
            { name: "Transmuter", path: routes.home },
            { name: "Simulator", path: routes.simulator },
          ],
        })}
      />
      <section className="subhero section-shell simulator-hero">
        <p className="eyebrow">SIMULATOR</p>
        <h1>What holders actually recover</h1>
        <p>
          Configure a launch and see what it produces. Every token launched through Transmuter carries reserves from the
          first block, and holders can redeem at any time for a pro-rata share of both the treasury and the pool, not
          only at end of life.
        </p>
      </section>
      <section className="simulator-body section-shell">
        <ValueCalculator />
      </section>
    </main>
  );
}
