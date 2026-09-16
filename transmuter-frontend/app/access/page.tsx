import type { Metadata } from "next";
import { AccessForm } from "@/app/access/access-form";
import { GoldButton } from "@/components/transmuter/gold-button";
import {
  HeroCorners,
  PerspectiveFloor,
  Pill,
  SectionLabel,
} from "@/components/transmuter/hero-elements";
import { SiteFooter, SiteNav } from "@/components/transmuter/site-chrome";
import { Wrap } from "@/components/transmuter/wrap";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Early Access",
  description:
    "Join the Transmuter closed beta. Help build safer markets and see every advantage firsthand before anyone else.",
};

const whyCards = [
  {
    tag: "01 · See it first",
    title: "Every advantage, firsthand",
    body: "Be among the first to launch and trade tokens that come with real contingency reserves, escrowed runway, and an end of life plan built in from the first block.",
  },
  {
    tag: "02 · Shape it",
    title: "Steer what ships",
    body: "Your feedback in the beta feeds directly into the mechanics, defaults, and interface before any of it is locked in for everyone else.",
  },
  {
    tag: "03 · For builders",
    title: "Hands-on, and recognised",
    body: "For teams launching a token, early partners get direct support from us, co-marketing, and standing as among the first to launch on safer rails.",
  },
  {
    tag: "04 · The mission",
    title: "Build safer markets",
    body: "Help prove a model where the people who hold are never the ones left with nothing, and put your name on it early.",
  },
  {
    tag: "05 · Get rewarded",
    title: "Rewards for showing up",
    body: "The people who help us test, break, and improve Transmuter are the ones we want to recognise, including through airdrops to those who genuinely contribute in the beta.",
  },
];

export default function AccessPage() {
  return (
    <div className="page-access">
      <SiteNav />

      <header>
        <PerspectiveFloor />
        <Wrap className="hero-framed">
          <HeroCorners />
          <div className="eyebrow">Closed beta · By invitation</div>
          <h1 className="hero-brand">EARLY ACCESS</h1>
          <Pill>Closed beta · Limited spots</Pill>
          <p className="hero-line">
            Get in early, help build safer markets, and see every advantage
            firsthand before the rest of the market does.
          </p>
          <p className="hero-sub">
            Transmuter is opening a closed beta to a small founding cohort. You
            will put the launchpad and its safety nets through their paces
            before they go public, and help shape what ships.
          </p>
          <div className="hero-cta">
            <GoldButton href="#join">Request access</GoldButton>
            <GoldButton href={routes.docs} variant="ghost">
              Read the docs
            </GoldButton>
          </div>
        </Wrap>
      </header>

      <section>
        <Wrap>
          <SectionLabel>Why join early</SectionLabel>
          <h2>A front-row seat, and a hand in the build</h2>
          <p className="sec-intro">
            This is a working beta, not a finished product, and that is the
            point. We prioritise the people who genuinely care about what we are
            building toward, safer and more sustainable markets, over whoever
            simply signs up first.
          </p>
          <div className="why">
            {whyCards.map((card) => (
              <div key={card.tag} className="ccard">
                <div className="tag">{card.tag}</div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </div>
            ))}
          </div>
        </Wrap>
      </section>

      <section className="join" id="join">
        <PerspectiveFloor />
        <Wrap>
          <SectionLabel>Request access</SectionLabel>
          <h2>Join the closed beta</h2>
          <p className="sec-intro">
            Spots are limited and we onboard in small waves. Tell us a little
            about you and we will reach out when your spot opens.
          </p>
          <div className="form-card">
            <AccessForm />
          </div>
        </Wrap>
      </section>

      <SiteFooter />
    </div>
  );
}
