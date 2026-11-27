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

const terms = [
  {
    title: "Backing ratio",
    body: "Reserves against market cap. Price-based, used for display and for the Mint to Scale gate.",
  },
  {
    title: "Transfer fee",
    body: "0.60% to 2.00% on every transfer, set at launch, changeable by holder vote. A redemption uses the highest fee in the 12 months before it; end of life uses the highest fee in the 12 months before the vote passed, and later redemptions use that rate.",
  },
  {
    title: "DAO token",
    body: "Transmuter's own token, itself an EOL token. 0.10% of every transfer buys it and burns it. A DAO pool of 10% to 20% is optional. Tokens for that pool are minted, never bought, at the highest of the live price, the 24-hour average and the redemption value, with no premium.",
  },
];

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
          Any holder can redeem at any time.
        </p>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">THE TERMS</p>
        <h2>Three words worth knowing.</h2>
        <div className="entry-grid">
          {terms.map((term) => (
            <article key={term.title}>
              <h3>{term.title}</h3>
              <p>{term.body}</p>
            </article>
          ))}
        </div>
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
        <h2>A share of each reserve asset.</h2>
        <p>
          A holder receives a share of each reserve asset, of USDC not yet converted, and of the pools&apos; cash. It is
          a quantity, counted in the assets, and it can fall when people sell above it or when the reserve assets fall
          in price. Holders own the pools and the treasury, and the contract manages them.
        </p>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">WHAT TRIGGERS END OF LIFE</p>
        <h2>A vote, followed by end of life defined in the contract.</h2>
        <p>
          After the trouble condition, two parties must agree to propose an end of life, one of them the creator or a
          holder with 0.1% of supply. Then a 30-day vote and a 48-hour wait.
        </p>
        <p>
          Then unvested team tokens burn, escrow comes back as USDC, the pools unwind, the fee is taken, and the rest is
          paid out. Investor tokens never burn. Unsold tokens were already burned at finalisation.
        </p>
        <p>
          No threshold to clear and no approval to wait for. Each holder redeems their share when they choose.
        </p>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">WHAT REDEEMING COSTS</p>
        <h2>Three charges, all disclosed first.</h2>
        <p>
          The redemption fee, a network fee, and about 0.002 SOL to open an account for an asset the holder has never
          held, refundable if they close it. With a DAO pool, the DAO token&apos;s own fee applies too.
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
          <p>A frozen asset is left out of a redemption until it can move. Nothing is ever written off.</p>
          <p>Staked tokens must be unstaked before they can be redeemed.</p>
          <p>A voter waits a week after the vote resolves.</p>
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
