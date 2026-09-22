import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { mediaUrl, type MediaStore } from "./types.ts";

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
