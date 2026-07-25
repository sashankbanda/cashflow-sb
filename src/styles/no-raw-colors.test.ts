import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The theming gate. Every colour, in components, must resolve through a token in
 * `tokens.css` — a raw hex, `rgba()`, or `white/x`/`black/x` opacity utility in
 * `src/**` is the leak that breaks alternate themes, so it fails the build.
 * Allowlisted: brand assets, server-rendered images / the PWA manifest (no CSS
 * context), and the JS mirror of the gradient tokens those images consume.
 */
const SRC = join(process.cwd(), "src");

const ALLOW_FILES = new Set([
  "components/ui/palette.ts", // JS mirror of the gradient tokens (for OG images)
  "features/auth/components/GoogleSignInButton.tsx", // Google brand colours
  "app/manifest.ts", // PWA manifest theme colours
  "app/manifest-icon/route.tsx", // generated app icon (no CSS)
  "app/(marketing)/join/[token]/opengraph-image.tsx", // OG image (no CSS)
  "app/api/report/image/route.tsx", // rendered report card (no CSS)
  "app/layout.tsx", // viewport themeColor metadata (no CSS)
]);
const ALLOW_DIRS = ["app/dev/"]; // dev gallery renders raw token values on purpose

const FORBIDDEN: Array<{ name: string; re: RegExp }> = [
  { name: "white/x opacity utility", re: /\bwhite\/\d/ },
  { name: "black/x opacity utility", re: /\bblack\/\d/ },
  { name: "raw hex colour", re: /#[0-9a-fA-F]{3,8}\b/ },
  { name: "raw rgb()/rgba()", re: /\brgba?\(/ },
];

function collect(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) collect(p, out);
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) out.push(p);
  }
}

describe("theming gate — no hard-coded colours outside tokens.css", () => {
  const files: string[] = [];
  collect(SRC, files);

  for (const file of files) {
    const rel = file.slice(SRC.length + 1).replaceAll("\\", "/");
    if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;
    if (ALLOW_FILES.has(rel) || ALLOW_DIRS.some((d) => rel.startsWith(d))) continue;

    it(rel, () => {
      const text = readFileSync(file, "utf8");
      for (const { name, re } of FORBIDDEN) {
        expect(re.test(text), `${rel} has a ${name} — move it into tokens.css`).toBe(false);
      }
    });
  }
});
