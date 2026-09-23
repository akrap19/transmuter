import type { Metadata } from "next";
import Link from "next/link";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { marketingPageGraph } from "@/lib/seo/json-ld";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";
import { routes } from "@/lib/routes";

const holdersTitle = "For holders: what stands behind an EOL token | Transmuter";
const holdersDescription =
  "What stands behind an EOL token, what triggers recovery, what recovery pays per token held, and what the protocol does not do.";

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
          EOL tokens have an isolated treasury and defined recovery rules. Some teams set an escrow schedule; others
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
          Recovery distributes a defined quantity of the reserve asset per token held, based on the available treasury
          and token supply. That quantity changes if reserves or supply change. A dollar-equivalent return is not
          promised, and contingency gold stays beneath the cToken on an ordinary project closure.
        </p>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">WHAT TRIGGERS RECOVERY</p>
        <h2>A vote, followed by contract-defined recovery.</h2>
        <p>
          The end-of-life gate precedes the governance vote. Once recovery is approved, the contract unwinds
          contract-owned liquidity, moves any unspent escrow into the treasury, burns unsold allocation and unvested
          team tokens, then distributes available reserves pro rata. These accounting steps do not depend on the
          team’s cooperation.
        </p>
        <p>
          Distribution is pro rata, so a large holder and a small one are treated identically. There is no threshold
          to clear and no claim to file.
        </p>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">LIMITS</p>
        <h2>What this does not do.</h2>
        <div className="limit-lines">
          <p>The reserves are worth what is in them. There is no central bank behind this.</p>
          <p>
            Recovery depends on the available reserves and the amount of the token you hold. The protocol makes no
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
