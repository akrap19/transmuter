type JsonLdScriptProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

/** JSON-LD must not be able to close the script tag when a coin name contains `<`. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLdScript({ data }: JsonLdScriptProps) {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
      type="application/ld+json"
    />
  );
}
