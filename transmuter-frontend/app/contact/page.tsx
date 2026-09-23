import type { Metadata } from "next";
import { externalLinks, teamEmail } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Collaborators, partners, investors, and future team members building end of life infrastructure with Transmuter.",
};

const roles = [
  {
    title: "Collaborators",
    body: "Builders, auditors, researchers, designers. If you can make the protocol better, sharper, or safer, we want to hear from you.",
  },
  {
    title: "Partners",
    body: "Wallets, DAOs, ecosystems, tokenized gold issuers, audit firms. Integrations that put EOL infrastructure into more hands.",
  },
  {
    title: "Investors",
    body: "We're raising our pre-seed round. Ask for the deck, the architecture, and the numbers behind both.",
  },
  {
    title: "Team",
    body: "A small but dedicated team on an important mission. If you see yourself in it, feel free to introduce yourself.",
  },
];

export default function ContactPage() {
  return (
    <main>
      <section className="subhero section-shell">
        <p className="eyebrow">CONTACT</p>
        <h1>Build it with us.</h1>
        <p>
          We&apos;re looking for collaborators, partners, investors and future team members who want a part in end of
          life infrastructure. If you can contribute, reach out.
        </p>
      </section>
      <section className="content-section section-shell">
        <p className="eyebrow">WHO WE&apos;RE LOOKING FOR</p>
        <h2>Pick your door.</h2>
        <div className="entry-grid">
          {roles.map((role) => (
            <article key={role.title}>
              <h3>{role.title}</h3>
              <p>{role.body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="closing-section section-shell">
        <div className="closing-content">
          <p className="eyebrow">HOW WE CHOOSE</p>
          <h2>Infrastructure that benefits every participant.</h2>
          <p>
            Every partnership is evaluated on one question: does this make the protocol more useful, more accessible,
            or more secure for holders?
          </p>
          <div className="hero-actions closing-actions">
            <a className="button button-primary" href={externalLinks.email}>
              {teamEmail}
            </a>
            <a className="button button-ghost" href={externalLinks.twitter} rel="noopener" target="_blank">
              @TransmuterTMI
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
