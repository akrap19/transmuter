import type { Metadata } from "next";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { marketingPageGraph } from "@/lib/seo/json-ld";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";

const accessTitle = "Get early access to Transmuter";
const accessDescription =
  "Tell us what you are launching and we will come back with what your token's structure would look like on Transmuter.";

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
            { name: "Early access", path: "/access" },
          ],
        })}
      />
      <section className="subhero access-hero section-shell">
        <p className="eyebrow">EARLY ACCESS</p>
        <h1>Get early access.</h1>
        <p>
          Tell us what you are launching. We will come back with what your token&apos;s structure would look like on
          Transmuter.
        </p>
      </section>

      <section className="access-section section-shell">
        <form
          action="mailto:info@transmuter.net"
          className="access-form"
          method="post"
          encType="text/plain"
        >
          <label>
            <span>Name</span>
            <input autoComplete="name" name="name" required />
          </label>
          <label>
            <span>Email</span>
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <label>
            <span>Project</span>
            <input name="project" required />
          </label>
          <label className="wide">
            <span>What are you launching?</span>
            <textarea name="launch" required rows={6}></textarea>
          </label>
          <button className="button button-primary" type="submit">
            Get early access
          </button>
        </form>
        <p className="access-note">
          This preview opens your email application to send the form. It is not connected to a web submission service.
        </p>
      </section>
    </main>
  );
}
