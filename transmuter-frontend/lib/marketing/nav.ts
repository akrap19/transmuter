import { routes } from "@/lib/routes";

export type SiteLink = {
  label: string;
  href: string;
};

// Header shows the two app actions as top-level tabs, then collapses the
// informational pages into a single "Learn" dropdown. The Beta testing CTA
// and wallet are rendered separately in SiteHeader.
export const headerPrimaryLinks: SiteLink[] = [
  { label: "Explore", href: routes.coins },
  { label: "Launchpad", href: routes.launchpad },
];

export const learnMenu: { label: string; links: SiteLink[] } = {
  label: "Learn",
  links: [
    { label: "Lifecycle", href: `${routes.home}#lifecycle` },
    { label: "Holders", href: routes.holders },
    { label: "FAQ", href: routes.faq },
    { label: "Glossary", href: routes.glossary },
    { label: "Docs", href: routes.docs },
    { label: "Integrate", href: routes.integrate },
  ],
};

// Footer columns mirror the same taxonomy as the header.
export const footerColumns: { title: string; links: SiteLink[] }[] = [
  {
    title: "App",
    links: [
      { label: "Explore", href: routes.coins },
      { label: "Launchpad", href: routes.launchpad },
      { label: "My Coins", href: routes.myCoins },
      { label: "Portfolio", href: routes.portfolio },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "Lifecycle", href: `${routes.home}#lifecycle` },
      { label: "Holders", href: routes.holders },
      { label: "FAQ", href: routes.faq },
      { label: "Glossary", href: routes.glossary },
      { label: "Docs", href: routes.docs },
    ],
  },
  {
    title: "More",
    links: [
      { label: "Launch platforms", href: routes.integrate },
      { label: "Beta testing", href: routes.access },
      { label: "Contact", href: routes.contact },
    ],
  },
];
