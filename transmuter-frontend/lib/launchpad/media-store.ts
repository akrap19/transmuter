import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import type { MediaUpload } from "./media";

export type SavedMedia = { id: string; url: string };

export type StoredMedia = {
  bytes: Uint8Array;
  contentType: string;
};

export type MediaStore = {
  save: (file: MediaUpload) => SavedMedia;
  read: (id: string) => StoredMedia | null;
};

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

export function createFileMediaStore(options: { origin: string; dir: string }): MediaStore {
  mkdirSync(options.dir, { recursive: true });
  return {
    save(file) {
      const id = randomBytes(16).toString("hex");
      writeFileSync(join(options.dir, `${id}.bin`), file.bytes);
      writeFileSync(
        join(options.dir, `${id}.json`),
        JSON.stringify({ contentType: file.contentType, filename: file.filename }),
      );
      return { id, url: mediaUrl(options.origin, id) };
    },
    read(id) {
      if (!/^[a-f0-9]+$/i.test(id)) return null;
      try {
        const bytes = new Uint8Array(readFileSync(join(options.dir, `${id}.bin`)));
        const meta = JSON.parse(readFileSync(join(options.dir, `${id}.json`), "utf8")) as {
          contentType: string;
        };
        return { bytes, contentType: meta.contentType };
      } catch {
        return null;
      }
    },
  };
}

function mediaUrl(origin: string, id: string): string {
  return `${origin.replace(/\/$/, "")}/api/media/${id}`;
}

let defaultStore: MediaStore | null = null;

export function getMediaStore(origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"): MediaStore {
  if (!defaultStore) {
    defaultStore = createFileMediaStore({
      origin,
      dir: join(process.cwd(), ".data", "media"),
    });
  }
  return defaultStore;
}
