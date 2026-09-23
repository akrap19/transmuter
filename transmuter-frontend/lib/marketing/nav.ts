import { routes } from "@/lib/routes";

export type SiteLink = {
  label: string;
  href: string;
};

export const headerLinks: SiteLink[] = [
  { label: "Lifecycle", href: `${routes.home}#lifecycle` },
  { label: "Explore", href: routes.coins },
  { label: "Launchpad", href: routes.launchpad },
  { label: "Holders", href: routes.holders },
  { label: "Integrate", href: routes.integrate },
  { label: "FAQ", href: routes.faq },
  { label: "Glossary", href: routes.glossary },
  { label: "Docs", href: routes.docs },
];

export const footerColumns: { title: string; links: SiteLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Lifecycle", href: `${routes.home}#lifecycle` },
      { label: "FAQ", href: routes.faq },
      { label: "Glossary", href: routes.glossary },
      { label: "Docs", href: routes.docs },
    ],
  },
  {
    title: "App",
    links: [
      { label: "Explore", href: routes.coins },
      { label: "Launchpad", href: routes.launchpad },
      { label: "My Coins", href: routes.myCoins },
      { label: "Portfolio", href: routes.portfolio },
      { label: "Holders", href: routes.holders },
    ],
  },
  {
    title: "More",
    links: [
      { label: "Launch platforms", href: routes.integrate },
      { label: "Early access", href: routes.access },
      { label: "Contact", href: routes.contact },
    ],
  },
];
