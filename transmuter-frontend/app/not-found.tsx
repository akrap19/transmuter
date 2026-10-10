import type { Metadata } from "next";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { siteAllowsIndexing } from "@/lib/seo/indexing";

export const metadata: Metadata = {
  title: "Page not found",
  robots: siteAllowsIndexing()
    ? { index: false, follow: true }
    : { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main>
      <section className="subhero section-shell">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>That address is not on Transmuter. The link may be out of date, or the launch is not in the index.</p>
        <div className="hero-actions">
          <Link className="button button-primary" href={routes.coins}>
            Explore coins
          </Link>
          <Link className="button button-ghost" href={routes.home}>
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}
