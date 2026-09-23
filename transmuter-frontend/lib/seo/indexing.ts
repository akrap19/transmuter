/** When false, staging/preview deploys should not be indexed (SEO pack). */
export function siteAllowsIndexing(): boolean {
  return process.env.SITE_ALLOW_INDEXING !== "false";
}
