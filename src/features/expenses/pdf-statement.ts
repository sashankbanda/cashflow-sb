/**
 * Client-side PDF statement reader. Everything happens ON DEVICE — the file
 * and its password never leave the phone; only the parsed entries the user
 * confirms are sent to the server. pdf.js is lazy-loaded so the import screen
 * costs nothing until a PDF is actually chosen.
 */

/** The PDF is encrypted: "need" = ask for a password, "wrong" = try again. */
export class PdfPasswordError extends Error {
  readonly reason: "need" | "wrong";
  constructor(reason: "need" | "wrong") {
    super(reason === "need" ? "Password required" : "Wrong password");
    this.name = "PdfPasswordError";
    this.reason = reason;
  }
}

/** Extract visual text lines (top → bottom, left → right) from a PDF. */
export async function extractPdfLines(data: ArrayBuffer, password?: string): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const task = pdfjs.getDocument({ data, password });
  let doc;
  try {
    doc = await task.promise;
  } catch (error) {
    const err = error as { name?: string; code?: number };
    if (err.name === "PasswordException") {
      // code 1 = password needed, 2 = incorrect password.
      throw new PdfPasswordError(err.code === 2 ? "wrong" : "need");
    }
    throw error;
  }

  try {
    const lines: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      // Text arrives as positioned fragments — rebuild lines by grouping on
      // the y coordinate (2pt buckets absorb baseline jitter).
      const buckets = new Map<number, Array<{ x: number; text: string }>>();
      for (const item of content.items) {
        if (!("str" in item) || item.str.trim() === "") continue;
        const y = Math.round(item.transform[5]! / 2) * 2;
        const bucket = buckets.get(y) ?? [];
        bucket.push({ x: item.transform[4]!, text: item.str });
        buckets.set(y, bucket);
      }
      const ys = [...buckets.keys()].sort((a, b) => b - a); // PDF y grows upward
      for (const y of ys) {
        const line = buckets
          .get(y)!
          .sort((a, b) => a.x - b.x)
          .map((fragment) => fragment.text)
          .join(" ")
          .replace(/\s{2,}/g, " ")
          .trim();
        if (line !== "") lines.push(line);
      }
    }
    return lines;
  } finally {
    await task.destroy();
  }
}
