import { decode, encode } from "blurhash";

/**
 * Browser-only image helpers: client-side compression (which also strips EXIF
 * by re-encoding through a canvas) and blurhash encode/decode. Call only in the
 * browser — these touch `document`/`canvas`.
 */

export interface ProcessedImage {
  blob: Blob;
  mime: string;
  width: number;
  height: number;
  blurhash: string;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
      type,
      quality,
    );
  });
}

function blurhashFor(source: CanvasImageSource, srcW: number, srcH: number): string {
  const width = 32;
  const height = Math.max(1, Math.round((width * srcH) / srcW));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(source, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  return encode(data, width, height, 4, 3);
}

/**
 * Downscale to `maxDim`, re-encode as WebP toward `targetBytes` (dropping
 * quality in steps), and compute a blurhash. EXIF is dropped by the re-encode.
 */
export async function processImageFile(
  file: File,
  maxDim = 1600,
  targetBytes = 500 * 1024,
): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const mime = "image/webp";
  let quality = 0.82;
  let blob = await canvasToBlob(canvas, mime, quality);
  while (blob.size > targetBytes && quality > 0.4) {
    quality -= 0.12;
    blob = await canvasToBlob(canvas, mime, quality);
  }

  const blurhash = blurhashFor(bitmap, width, height);
  bitmap.close();
  return { blob, mime, width, height, blurhash };
}

/** Decode a blurhash to a data URL for use as a placeholder background. */
export function blurhashToDataUrl(hash: string, size = 32): string | null {
  if (typeof document === "undefined") return null;
  try {
    const pixels = decode(hash, size, size);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const image = ctx.createImageData(size, size);
    image.data.set(pixels);
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL();
  } catch {
    return null;
  }
}
