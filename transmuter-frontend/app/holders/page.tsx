import type { Metadata } from "next";
import Link from "next/link";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { marketingPageGraph } from "@/lib/seo/json-ld";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";
import { routes } from "@/lib/routes";

const holdersTitle = "For holders: what stands behind an EOL token | Transmuter";
const holdersDescription =
  "What stands behind an EOL token, what triggers end of life, what redemption pays per token held, and what the protocol does not do.";

export const metadata: Metadata = marketingPageMetadata({
  path: "/holders",
  title: holdersTitle,
  description: holdersDescription,
  absoluteTitle: true,
});

export default function HoldersPage() {
  return (
    <main>
      <JsonLdScript
        data={marketingPageGraph({
          path: "/holders",
          name: holdersTitle,
          description: holdersDescription,
          breadcrumbs: [
            { name: "Transmuter", path: "/" },
            { name: "Holders", path: "/holders" },
          ],
        })}
      />
      <section className="subhero section-shell">
        <p className="eyebrow">FOR HOLDERS</p>
        <h1>What stands behind the token you hold.</h1>
        <p>
          EOL tokens have an isolated treasury and defined end of life rules. Some teams set an escrow schedule; others
          launch with no escrow. The contract terms, rather than a venue endorsement, tell you what was configured.
        </p>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">THE SITUATION</p>
        <h2>Know the terms before the project stops.</h2>
        <p>
          Protection can take different forms and durations. A configured escrow supports a team while it is being
          released. The isolated treasury remains separate even after that escrow has been drawn.
        </p>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">WHAT YOU RECEIVE</p>
        <h2>A quantity, not a value.</h2>
        <p>
          End of life lets each holder redeem a defined quantity of the base asset per token held, based on the
          available treasury and token supply. That quantity changes if reserves or supply change. It is counted in
          the base asset, and contingency gold stays beneath the cToken on an ordinary closure where the project
          chooses the gold variant.
        </p>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">WHAT TRIGGERS END OF LIFE</p>
        <h2>A vote, followed by end of life defined in the contract.</h2>
        <p>
          The end of life gate precedes the governance vote. Once end of life is approved, the contract unwinds
          contract-owned liquidity, moves any unspent escrow into the treasury, and burns unsold allocation and
          unvested team tokens. These accounting steps do not depend on the team’s cooperation.
        </p>
        <p>
          No threshold to clear and no approval to wait for. Each holder redeems their share when they choose.
        </p>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">LIMITS</p>
        <h2>What this does not do.</h2>
        <div className="limit-lines">
          <p>The reserves are worth what is in them. There is no central bank behind this.</p>
          <p>
            What you can redeem depends on the available reserves and the amount of the token you hold. The protocol makes no
            prediction about token price or investment returns.
          </p>
          <p>Reserve growth depends on trading volume and slows in a downturn.</p>
          <p>Escrow is optional. If a team chooses no escrow, there are no scheduled team funds for holders to pause.</p>
        </div>
      </section>
      <section className="closing-section section-shell">
        <div className="closing-content">
          <p>Browse the indexed launches, or open the wallet tools for coins you hold.</p>
          <div className="hero-actions closing-actions">
            <Link className="button button-primary" href={routes.coins}>
              Explore launches
            </Link>
            <Link className="button button-ghost" href={routes.portfolio}>
              Open portfolio
            </Link>
            <Link className="button button-ghost" href={routes.docs}>
              Read the docs
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
