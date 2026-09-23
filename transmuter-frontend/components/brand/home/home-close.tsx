import Link from "next/link";
import { FaqList } from "@/components/brand/faq-list";
import { homeFaqs } from "@/lib/marketing/home-faq";
import { routes } from "@/lib/routes";

const rails = ["Reserves", "Governed escrow", "Contract-owned liquidity", "Recovery"];

export function HomeEntry() {
  return (
    <section className="integration-section section-shell reveal">
      <div className="integration-copy">
        <p className="eyebrow">TWO WAYS IN</p>
        <h2>Launch with it. Or integrate it.</h2>
      </div>
      <div className="entry-grid">
        <article>
          <small>A · NATIVE</small>
          <h3>Launch with Transmuter.</h3>
          <p>Launch with the full Transmuter stack already configured.</p>
          <Link href={routes.launchpad}>Open the launchpad →</Link>
        </article>
        <article>
          <small>B · INTEGRATED</small>
          <h3>Bring your own launch stack.</h3>
          <p>Launch platforms can add Transmuter rails beneath their own product.</p>
          <Link href={routes.integrate}>For launch platforms →</Link>
        </article>
      </div>
      <div className="protocol-bar">
        <strong>TRANSMUTER PROTOCOL</strong>
        <span>RESERVES · ESCROW · LIQUIDITY · RECOVERY</span>
        <div>
          {rails.map((rail) => (
            <i key={rail}>{rail}</i>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeFaq() {
  return (
    <section className="faq-section section-shell section-light" id="faq">
      <div className="faq-intro reveal">
        <p className="eyebrow">FAQ</p>
        <h2>
          The essentials, <span>answered directly.</span>
        </h2>
        <p>The short version before you go deeper.</p>
      </div>
      <FaqList items={homeFaqs} />
      <div className="faq-more">
        <Link className="text-link" href={routes.faq}>
          Read the full FAQ →
        </Link>
      </div>
    </section>
  );
}

export function HomeClose() {
  return (
    <section className="closing-section section-shell">
      <div className="closing-rule reveal">
        <span />
        <i />
        <span />
      </div>
      <div className="closing-content reveal">
        <p className="eyebrow">EARLY ACCESS</p>
        <h2>Launch with the ending already written.</h2>
        <p>Early access is open.</p>
        <div className="hero-actions closing-actions">
          <Link className="button button-primary" href={routes.access}>
            Get early access
          </Link>
        </div>
      </div>
    </section>
  );
}
