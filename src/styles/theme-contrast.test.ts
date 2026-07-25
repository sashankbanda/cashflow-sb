import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Programmatic WCAG contrast gate for every theme. Parses tokens.css, resolves
 * each theme's tokens (override → base), composites any alpha over its surface,
 * and asserts body text ≥ 4.5:1 and large/UI ≥ 3:1. Whether a theme looks good
 * is a human call; that it's legible is machine-checked here.
 */
const css = readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf8");

type Rgb = { r: number; g: number; b: number; a: number };

function parseColor(value: string): Rgb {
  const v = value.trim();
  if (v.startsWith("#")) {
    let h = v.slice(1);
    if (h.length === 3)
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }
  const m = /rgba?\(([^)]+)\)/.exec(v);
  if (!m) throw new Error(`Unparseable color: ${value}`);
  const p = m[1]!.split(",").map((s) => Number(s.trim()));
  return { r: p[0]!, g: p[1]!, b: p[2]!, a: p[3] ?? 1 };
}

function collectVars(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]!] = m[2]!.trim();
  return out;
}

// Base = every --var declaration with the [data-theme] blocks removed.
const themeBlocks = [...css.matchAll(/\[data-theme="(\w+)"\]\s*\{([^}]*)\}/g)];
let baseText = css;
const overrides: Record<string, Record<string, string>> = {};
for (const m of themeBlocks) {
  overrides[m[1]!] = collectVars(m[2]!);
  baseText = baseText.replace(m[0], "");
}
const base = collectVars(baseText);

function resolve(theme: string, token: string): string {
  const v = theme === "base" ? base[token] : (overrides[theme]?.[token] ?? base[token]);
  if (!v) throw new Error(`Missing token ${token} in ${theme}`);
  return v;
}

function luminance({ r, g, b }: Rgb): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Contrast of `fg` (composited over solid `bg` if translucent) against `bg`. */
function contrast(theme: string, fgToken: string, bgToken: string): number {
  const bg = parseColor(resolve(theme, bgToken));
  const fgRaw = parseColor(resolve(theme, fgToken));
  const fg =
    fgRaw.a < 1
      ? {
          r: fgRaw.a * fgRaw.r + (1 - fgRaw.a) * bg.r,
          g: fgRaw.a * fgRaw.g + (1 - fgRaw.a) * bg.g,
          b: fgRaw.a * fgRaw.b + (1 - fgRaw.a) * bg.b,
          a: 1,
        }
      : fgRaw;
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const THEMES = ["base", "dusk", "statement", "grid"];

describe.each(THEMES)("theme %s — WCAG contrast", (theme) => {
  it("primary text ≥ 4.5:1 on canvas and raised surfaces", () => {
    expect(contrast(theme, "color-fg-1", "color-canvas")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme, "color-fg-1", "surface-raised")).toBeGreaterThanOrEqual(4.5);
  });
  it("secondary text ≥ 4.5:1 on canvas and raised surfaces", () => {
    expect(contrast(theme, "color-fg-2", "color-canvas")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme, "color-fg-2", "surface-raised")).toBeGreaterThanOrEqual(4.5);
  });
  it("tertiary text ≥ 4.5:1 on inset surfaces", () => {
    expect(contrast(theme, "color-fg-3", "surface-inset")).toBeGreaterThanOrEqual(4.5);
  });
  it("accent button text ≥ 3:1 (large/UI)", () => {
    expect(contrast(theme, "color-on-volt", "color-volt")).toBeGreaterThanOrEqual(3);
  });
});
