import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Simple-surface gate. The design is deliberately plain — white cards, light
 * borders, soft shadows, zero translucency — so this pins that: every surface
 * utility exists and none applies a `backdrop-filter`, and no component
 * hand-rolls a `backdrop-blur`. Visual effects creep back in one PR at a time;
 * this makes that a failing test instead of a slow drift.
 */
const tokens = readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf8");

function utilBody(name: string): string {
  const start = tokens.indexOf(`@utility ${name} {`);
  expect(start, `@utility ${name} not found`).toBeGreaterThanOrEqual(0);
  const next = tokens.indexOf("@utility ", start + 1);
  return tokens.slice(start, next === -1 ? undefined : next);
}

const SURFACES = ["glass", "glass-soft", "glass-floating", "glass-overlay"];

describe("simple surfaces", () => {
  it("every surface is a plain fill — no backdrop-filter", () => {
    for (const util of SURFACES) {
      expect(utilBody(util), `${util} should be a plain surface`).not.toMatch(/backdrop-filter/);
    }
  });

  it("no component hand-rolls a backdrop-blur", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
          if (!p.replaceAll("\\", "/").includes("/app/dev")) walk(p);
        } else if (
          (p.endsWith(".tsx") || p.endsWith(".ts")) &&
          !p.endsWith(".test.ts") &&
          !p.endsWith(".test.tsx")
        ) {
          if (/backdrop-blur/.test(readFileSync(p, "utf8"))) offenders.push(p);
        }
      }
    };
    walk(join(process.cwd(), "src"));
    expect(offenders).toEqual([]);
  });
});
