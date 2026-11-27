import type { Metadata } from "next";
import Link from "next/link";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { marketingPageGraph } from "@/lib/seo/json-ld";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";
import { externalLinks, routes } from "@/lib/routes";

const integrateTitle = "Integrate Transmuter beneath your own launch product";
const integrateDescription =
  "Launch platforms can add Transmuter reserves, governed escrow, pools nobody can pull or drain, and end of life beneath their own product and brand.";

export const metadata: Metadata = marketingPageMetadata({
  path: "/integrate",
  title: integrateTitle,
  description: integrateDescription,
  absoluteTitle: true,
});

const rails = ["Reserves", "Governed escrow", "Pools nobody can pull or drain", "End of life"];

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
        <h1>Add end of life rails beneath your own launch product.</h1>
        <p>
          Reserves and end of life rails can sit beneath an existing launch experience while the platform keeps its own
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
          An isolated treasury, pools nobody can pull or drain, and defined end of life rules form the core. Escrow is a
          project choice: teams may set a fixed schedule or choose none.
        </p>
        <div className="rail-grid">
          {rails.map((rail) => (
            <span key={rail}>{rail}</span>
          ))}
        </div>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">THE RESERVES</p>
        <h2>An isolated treasury in the assets the creator picks.</h2>
        <p>
          Each project keeps its own treasury, holding its own basket of BTC, SOL and USDC, 1 to 5 of them. Where the
          project chooses, an optional DAO pool is the only link between tokens.
        </p>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">WHAT REDEEMING COSTS</p>
        <h2>Disclosed before anyone commits.</h2>
        <p>
          The redemption fee, a network fee, and about 0.002 SOL to open an account for an asset the holder has never
          held, refundable if they close it. With a DAO pool, the DAO token&apos;s own fee applies too.
        </p>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">WHAT TRIGGERS END OF LIFE</p>
        <h2>Trouble gate, two parties, a 30-day vote, a 48-hour wait.</h2>
        <p>
          Then unvested team tokens burn, escrow comes back as USDC, the pools unwind, the fee is taken, and the rest is
          paid out. Investor tokens never burn. Unsold tokens were already burned at finalisation.
        </p>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">NO THRESHOLD</p>
        <h2>No threshold to clear.</h2>
        <p>Holders redeem when they choose, not only after an end of life.</p>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">WHAT YOUR USERS SEE</p>
        <h2>Your flow, your brand, your interface.</h2>
        <p>The rails sit underneath. Nothing about the launch experience has to change hands.</p>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">LIMITS</p>
        <h2>What this does not do.</h2>
        <div className="limit-lines">
          <p>Reserves are worth what is in them. There is no price prediction behind this.</p>
          <p>Escrow is optional. If a team chooses no escrow, there are no scheduled team funds to pause.</p>
          <p>A frozen asset is left out of a redemption until it can move. Nothing is ever written off.</p>
          <p>Staked tokens must be unstaked before they can be redeemed.</p>
          <p>A voter waits a week after the vote resolves.</p>
        </div>
      </section>
      <section className="closing-section section-shell">
        <div className="closing-content">
          <p>
            Commercial terms and any additional fee set by the platform are not finalised. A partner launchpad may add
            its own fee on top, and that fee is theirs. We have not published the requirements for moving an already
            live token onto the protocol.
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
