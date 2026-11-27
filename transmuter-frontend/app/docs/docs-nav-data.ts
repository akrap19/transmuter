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
      { label: "Token types", href: "#token-types" },
      { label: "Reserve assets", href: "#reserve-assets" },
      { label: "Ratios and verification", href: "#ratios-and-verification" },
    ],
  },
  {
    label: "Launching",
    links: [
      { label: "Launching a token", href: "#launching-a-token" },
      { label: "The public sale", href: "#the-public-sale" },
      { label: "Escrow", href: "#escrow" },
      { label: "Fees", href: "#fees" },
    ],
  },
  {
    label: "Lifecycle",
    links: [
      { label: "Mint to Scale", href: "#mint-to-scale" },
      { label: "Staking", href: "#staking" },
      { label: "What happens when a project stops", href: "#what-happens-when-a-project-stops" },
      { label: "End of life", href: "#end-of-life" },
    ],
  },
  {
    label: "Infrastructure",
    links: [
      { label: "Governance", href: "#governance" },
      { label: "For launch platforms", href: "#for-launch-platforms" },
      { label: "Status", href: "#status" },
    ],
  },
];
