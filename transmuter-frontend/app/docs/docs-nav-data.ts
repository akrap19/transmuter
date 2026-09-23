export type DocsNavLink = {
  label: string;
  href: string;
};

export type DocsNavGroup = {
  label: string;
  links: DocsNavLink[];
};

export const docsNavGroups: DocsNavGroup[] = [
  {
    label: "Protocol",
    links: [
      { label: "Overview", href: "#overview" },
      { label: "Token Types", href: "#token-types" },
      { label: "Reserve Assets", href: "#reserve-assets" },
      { label: "Ratios and Verification", href: "#ratios-and-verification" },
    ],
  },
  {
    label: "Launching",
    links: [
      { label: "Launching a Token", href: "#launching-a-token" },
      { label: "The Public Sale", href: "#the-public-sale" },
      { label: "Escrow", href: "#escrow" },
      { label: "Fees", href: "#fees" },
    ],
  },
  {
    label: "Lifecycle",
    links: [
      { label: "Mint to Scale", href: "#mint-to-scale" },
      { label: "What Happens When a Project Stops", href: "#what-happens-when-a-project-stops" },
      { label: "End of Life", href: "#end-of-life" },
    ],
  },
  {
    label: "Infrastructure",
    links: [
      { label: "For Launch Platforms", href: "#for-launch-platforms" },
      { label: "Governance", href: "#governance" },
      { label: "Status", href: "#status" },
    ],
  },
];
