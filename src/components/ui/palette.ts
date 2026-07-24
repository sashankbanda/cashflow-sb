/**
 * The five gradient palettes plus aurora, as typed lookups of literal Tailwind
 * classes (class names must be statically analyzable — never interpolate).
 */
export type Palette = "ember" | "ocean" | "mint" | "iris" | "solar" | "aurora";

export const PALETTES = [
  "ember",
  "ocean",
  "mint",
  "iris",
  "solar",
] as const satisfies readonly Palette[];

export const paletteBg: Record<Palette, string> = {
  ember: "bg-grad-ember",
  ocean: "bg-grad-ocean",
  mint: "bg-grad-mint",
  iris: "bg-grad-iris",
  solar: "bg-grad-solar",
  aurora: "bg-grad-aurora",
};

export const paletteGlow: Record<Palette, string> = {
  ember: "shadow-glow-ember",
  ocean: "shadow-glow-ocean",
  mint: "shadow-glow-mint",
  iris: "shadow-glow-iris",
  solar: "shadow-glow-solar",
  aurora: "shadow-ambient-lg",
};

/** Flat accent color per palette, for icon tints and chart strokes. */
export const paletteAccentText: Record<Palette, string> = {
  ember: "text-ember-1",
  ocean: "text-ocean-1",
  mint: "text-mint-2",
  iris: "text-iris-1",
  solar: "text-solar-1",
  aurora: "text-fg-1",
};

/** Raw gradient stops per palette — for contexts without CSS (OG images). */
export const PALETTE_HEX: Record<Palette, [string, string, string]> = {
  ember: ["#ff5c39", "#f02d65", "#58122e"],
  ocean: ["#4cc3ff", "#2e63f0", "#0b1e4b"],
  mint: ["#b7f8c8", "#2ed486", "#0a3d2c"],
  iris: ["#c99aff", "#7c3aed", "#250b52"],
  solar: ["#ffe44d", "#f59e0b", "#4a2a05"],
  aurora: ["#f02d65", "#7c3aed", "#2e63f0"],
};

/** Narrow an arbitrary string (e.g. a DB column) to a Palette, ocean default. */
export function asPalette(value: string): Palette {
  return (PALETTES as readonly string[]).includes(value) ? (value as Palette) : "ocean";
}

/** Deterministically assign a palette to an arbitrary name (avatars, covers). */
export function paletteForName(name: string): (typeof PALETTES)[number] {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % PALETTES.length;
  return PALETTES[index] ?? "ocean";
}
