export type MediaUpload = {
  bytes: Uint8Array;
  contentType: string;
  filename: string;
};

export type SavedMedia = { id: string; url: string };

export type StoredMedia = {
  bytes: Uint8Array;
  contentType: string;
};

export type MediaStore = {
  save: (file: MediaUpload) => SavedMedia;
  read: (id: string) => StoredMedia | null;
};

export const MAX_MEDIA_BYTES = 2 * 1024 * 1024;

export const ALLOWED_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/json",
]);

export function mediaUrl(origin: string, id: string): string {
  return `${origin.replace(/\/$/, "")}/media/${id}`;
}
