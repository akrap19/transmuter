type JsonLdScriptProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function JsonLdScript({ data }: JsonLdScriptProps) {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      type="application/ld+json"
    />
  );
}
