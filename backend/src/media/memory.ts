import { randomBytes } from "node:crypto";
import { mediaUrl, type MediaStore, type StoredMedia } from "./types.ts";

type MemoryRecord = StoredMedia & { id: string };

export function createMemoryMediaStore(options: { origin: string }): MediaStore {
  const records = new Map<string, MemoryRecord>();
  return {
    save(file) {
      const id = randomBytes(16).toString("hex");
      records.set(id, { id, bytes: file.bytes, contentType: file.contentType });
      return { id, url: mediaUrl(options.origin, id) };
    },
    read(id) {
      const record = records.get(id);
      if (!record) return null;
      return { bytes: record.bytes, contentType: record.contentType };
    },
  };
}
