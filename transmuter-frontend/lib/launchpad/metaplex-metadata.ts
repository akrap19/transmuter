export type MetaplexMetadataInput = {
  name: string;
  symbol: string;
  description: string;
  image: string | null;
  externalUrl: string;
  twitter: string;
  telegram: string;
  discord: string;
  imageMimeType?: string;
};

export type MetaplexMetadata = {
  name: string;
  symbol: string;
  description: string;
  image?: string;
  external_url?: string;
  properties: {
    category: "fungible";
    files: Array<{ uri: string; type: string }>;
  };
  extensions: Record<string, string>;
};

export function buildMetaplexMetadata(input: MetaplexMetadataInput): MetaplexMetadata {
  const image = input.image?.trim() || undefined;
  const externalUrl = input.externalUrl.trim() || undefined;
  const extensions: Record<string, string> = {};
  if (input.twitter.trim()) extensions.twitter = input.twitter.trim();
  if (input.telegram.trim()) extensions.telegram = input.telegram.trim();
  if (input.discord.trim()) extensions.discord = input.discord.trim();

  return {
    name: input.name,
    symbol: input.symbol,
    description: input.description,
    ...(image ? { image } : {}),
    ...(externalUrl ? { external_url: externalUrl } : {}),
    properties: {
      category: "fungible",
      files: image
        ? [{ uri: image, type: input.imageMimeType ?? inferImageType(image) }]
        : [],
    },
    extensions,
  };
}

function inferImageType(uri: string): string {
  if (uri.endsWith(".jpg") || uri.endsWith(".jpeg")) return "image/jpeg";
  if (uri.endsWith(".svg")) return "image/svg+xml";
  if (uri.endsWith(".webp")) return "image/webp";
  return "image/png";
}
