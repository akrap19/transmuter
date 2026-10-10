const META_DESCRIPTION_MAX = 160;

/** Collapse whitespace and keep a search snippet inside the usual description length. */
export function metaDescription(text: string, fallback: string): string {
  const source = collapse(text) || collapse(fallback);
  if (source.length <= META_DESCRIPTION_MAX) return source;
  const cut = source.slice(0, META_DESCRIPTION_MAX - 1);
  const word = cut.lastIndexOf(" ");
  const trimmed = (word > 80 ? cut.slice(0, word) : cut).trimEnd();
  return `${trimmed}…`;
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
