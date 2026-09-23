import type { Metadata } from "next";
import Link from "next/link";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { marketingPageGraph } from "@/lib/seo/json-ld";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";
import { externalLinks, routes } from "@/lib/routes";

const integrateTitle = "Integrate Transmuter beneath your own launch product";
const integrateDescription =
  "Launch platforms can add Transmuter reserves, governed escrow, contract-owned liquidity and recovery beneath their own product and brand.";

export const metadata: Metadata = marketingPageMetadata({
  path: "/integrate",
  title: integrateTitle,
  description: integrateDescription,
  absoluteTitle: true,
});

const rails = ["Reserves", "Governed escrow", "Contract-owned liquidity", "Recovery"];

export default function IntegratePage() {
  return (
    <main>
      <JsonLdScript
        data={marketingPageGraph({
          path: "/integrate",
          name: integrateTitle,
          description: integrateDescription,
          breadcrumbs: [
            { name: "Transmuter", path: "/" },
            { name: "Launch platforms", path: "/integrate" },
          ],
        })}
      />
      <section className="subhero section-shell">
        <p className="eyebrow">FOR LAUNCH PLATFORMS</p>
        <h1>Add recovery rails beneath your own launch product.</h1>
        <p>
          Reserves and recovery rails can sit beneath an existing launch experience while the platform keeps its own
          product and brand.
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href={externalLinks.email}>
            Talk integrations
          </a>
          <Link className="button button-ghost" href={routes.docs}>
            Read the docs
          </Link>
        </div>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">WHAT INTEGRATES</p>
        <h2>Four rails, used together or separately.</h2>
        <p>
          An isolated treasury, contract-owned liquidity and defined recovery rules form the core. Escrow is a project
          choice: teams may set a fixed schedule or choose none.
        </p>
        <div className="rail-grid">
          {rails.map((rail) => (
            <span key={rail}>{rail}</span>
          ))}
        </div>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">RESERVE LAYER</p>
        <h2>An isolated treasury, with a shared reserve layer below.</h2>
        <p>
          Each project retains its own treasury. Projects using the same cToken contribute to the layer beneath it
          through activity. Contingency gold has separate redemption rights and remains at the cToken level when an
          ordinary project closes.
        </p>
        <p>
          Gold accumulates beneath a cToken across years and across every project that trades on top of it. Integrators
          connect to the same reserve layer; contingency gold stays at the cToken level on an ordinary project closure
          and is a fallback if the base asset fails.
        </p>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">WHAT YOUR USERS SEE</p>
        <h2>Your flow, your brand, your interface.</h2>
        <p>The rails sit underneath. Nothing about the launch experience has to change hands.</p>
      </section>
      <section className="closing-section section-shell">
        <div className="closing-content">
          <p>
            Commercial terms and any platform-set additional fee are not finalized. We have not published the
            requirements for moving an already-live token onto the protocol.
          </p>
          <div className="hero-actions closing-actions">
            <a className="button button-primary" href={externalLinks.email}>
              Talk integrations
            </a>
            <Link className="button button-ghost" href={routes.launchpad}>
              Open the native launchpad
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
