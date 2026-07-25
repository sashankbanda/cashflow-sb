import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Glassmorphism gate. The look depends on frosted surfaces, so every glass
 * utility must actually apply a `backdrop-filter` blur (a regression that
 * flattens them to solid fills would kill the aesthetic), each must keep a solid
 * fallback for no-backdrop-filter / reduced transparency, and components must go
 * through those utilities rather than hand-rolling a `backdrop-blur`.
 */
const tokens = readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf8");

function utilBody(name: string): string {
  const start = tokens.indexOf(`@utility ${name} {`);
  expect(start, `@utility ${name} not found`).toBeGreaterThanOrEqual(0);
  const next = tokens.indexOf("@utility ", start + 1);
  return tokens.slice(start, next === -1 ? undefined : next);
}

const FROSTED = ["glass", "glass-soft", "glass-floating", "glass-overlay"];

describe("glassmorphism", () => {
  it("every frosted surface applies a backdrop blur", () => {
    for (const util of FROSTED) {
      expect(utilBody(util), `${util} should be frosted glass`).toMatch(/backdrop-filter:\s*blur\(/);
    }
  });

  it("each frosted surface has a solid fallback", () => {
    for (const util of FROSTED) {
      const body = utilBody(util);
      expect(body, `${util} needs an @supports fallback`).toMatch(/@supports not \(backdrop-filter/);
      expect(body, `${util} needs a reduced-transparency fallback`).toMatch(
        /prefers-reduced-transparency: reduce/,
      );
    }
  });

  it("no component hand-rolls a backdrop-blur (use the glass utilities)", () => {
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
