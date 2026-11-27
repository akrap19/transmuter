import type { Metadata } from "next";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { marketingPageGraph } from "@/lib/seo/json-ld";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";
import { routes } from "@/lib/routes";
import { ValueCalculator } from "./value-calculator";

const title = "Simulator";
const description =
  "Configure a token launch and see what it produces, including what holders can redeem at any time and how a wind-down pays out across price paths.";

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
        <aside className="simulator-resnote">
          <span>Reserves in this calculator</span>
          <strong>Reserves here are modelled as stablecoins (USDC)</strong>, so they keep their dollar value in every
          scenario. We use stablecoins for now because the history charts follow SOL&apos;s real price, and SOL held as
          a reserve would simply rise and fall with the token, which would show nothing useful. Real reserves held in
          BTC or SOL fluctuate in value.
        </aside>
      </section>
      <section className="simulator-body section-shell">
        <ValueCalculator />
      </section>
    </main>
  );
}
