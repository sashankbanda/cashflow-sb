import "server-only";
import { del, put } from "@vercel/blob";
import { env } from "@/env";

/** Whether receipt storage is wired (Vercel Blob token present). */
export function isStorageConfigured(): boolean {
  return Boolean(env.BLOB_READ_WRITE_TOKEN);
}

export interface StoredObject {
  url: string;
}

/**
 * Blob storage behind a tiny interface so the app never touches a provider SDK
 * directly. The Vercel Blob implementation is the default; swapping providers
 * is a one-file change.
 */
export interface StorageAdapter {
  put(key: string, data: Buffer, contentType: string): Promise<StoredObject>;
  delete(url: string): Promise<void>;
}

class VercelBlobAdapter implements StorageAdapter {
  async put(key: string, data: Buffer, contentType: string): Promise<StoredObject> {
    const token = env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new Error("Blob storage is not configured (BLOB_READ_WRITE_TOKEN missing).");
    const result = await put(key, data, {
      access: "public",
      contentType,
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return { url: result.url };
  }

  async delete(url: string): Promise<void> {
    const token = env.BLOB_READ_WRITE_TOKEN;
    if (!token) return;
    await del(url, { token });
  }
}

export const storage: StorageAdapter = new VercelBlobAdapter();
