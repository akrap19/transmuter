export const routes = {
  home: "/",
  launchpad: "/launchpad",
  docs: "/docs",
  access: "/access",
  contact: "/contact",
  coins: "/coins",
} as const;

export function coinPath(mint: string) {
  return `${routes.coins}/${mint}` as const;
}

export const teamEmail = "info@transmuter.net";

export const externalLinks = {
  twitter: "https://x.com/TransmuterTMI",
  email: `mailto:${teamEmail}`,
  studio19: "https://www.studio19.dev/",
} as const;

export type RoutePath = (typeof routes)[keyof typeof routes];
