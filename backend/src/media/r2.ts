import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomBytes } from "node:crypto";
import type { MediaStore, MediaUpload } from "./types.ts";

export const MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";

const EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "application/json": ".json",
};

const READ_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg", ".json"];

export type R2Object = { body: Uint8Array; contentType: string };

export type R2Client = {
  put: (input: { key: string; body: Uint8Array; contentType: string; cacheControl: string }) => Promise<void>;
  get: (key: string) => Promise<R2Object | null>;
};

export function mediaExtension(contentType: string): string {
  return EXTENSIONS[contentType] ?? "";
}

export function publicObjectUrl(publicUrl: string, key: string): string {
  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}

export function createS3R2Client(options: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}): R2Client {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${options.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
  });

  return {
    async put(input) {
      await client.send(
        new PutObjectCommand({
          Bucket: options.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          CacheControl: input.cacheControl,
        }),
      );
    },
    async get(key) {
      try {
        const out = await client.send(new GetObjectCommand({ Bucket: options.bucket, Key: key }));
        if (!out.Body) return null;
        return {
          body: await out.Body.transformToByteArray(),
          contentType: out.ContentType ?? "application/octet-stream",
        };
      } catch (error) {
        const name = (error as { name?: string }).name;
        if (name === "NoSuchKey" || name === "NotFound") return null;
        throw error;
      }
    },
  };
}

export function createR2MediaStore(options: { publicUrl: string; client: R2Client }): MediaStore {
  return {
    async save(file: MediaUpload) {
      const id = randomBytes(16).toString("hex");
      const key = `${id}${mediaExtension(file.contentType)}`;
      await options.client.put({
        key,
        body: file.bytes,
        contentType: file.contentType,
        cacheControl: MEDIA_CACHE_CONTROL,
      });
      return { id, url: publicObjectUrl(options.publicUrl, key) };
    },
    async read(id: string) {
      const keys = objectKeys(id);
      if (keys.length === 0) return null;
      for (const key of keys) {
        const found = await options.client.get(key);
        if (found) return { bytes: found.body, contentType: found.contentType };
      }
      return null;
    },
  };
}

function objectKeys(id: string): string[] {
  if (/^[a-f0-9]+\.[a-z0-9]+$/i.test(id)) return [id];
  if (!/^[a-f0-9]+$/i.test(id)) return [];
  return READ_EXTENSIONS.map((extension) => `${id}${extension}`);
}
