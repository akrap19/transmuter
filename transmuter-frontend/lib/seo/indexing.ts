const INDEXABLE_HOST = "www.transmuter.net";

/** When false, staging and preview deploys should not be indexed. */
export function siteAllowsIndexing(): boolean {
  if (process.env.SITE_ALLOW_INDEXING === "false") return false;
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv && vercelEnv !== "production") return false;
  return true;
}

/** Only the canonical host is indexable. Preview hosts such as *.vercel.app are not. */
export function isIndexableHost(host: string | null | undefined): boolean {
  const name = host?.split(":")[0]?.trim().toLowerCase();
  return name === INDEXABLE_HOST;
}
