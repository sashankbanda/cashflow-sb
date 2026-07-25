import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Pins the Phase-2 blur budget so it can't regress: exactly one live
 * `backdrop-filter` in the whole app — the modal sheet (`glass-overlay`) — and
 * no component reintroduces a `backdrop-blur` utility. Each blur is a full GPU
 * pass over a live snapshot; this keeps it at one, modal, one-at-a-time.
 */
const tokens = readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf8");

describe("blur budget", () => {
  it("has exactly one live backdrop-filter, on glass-overlay", () => {
    const live = tokens.match(/backdrop-filter:\s*blur\(40px\)/g) ?? [];
    expect(live.length).toBe(1);
    expect(tokens).toMatch(/@utility glass-overlay[\s\S]*?backdrop-filter:\s*blur\(40px\)/);
  });

  it("card/dock surfaces are solid (no backdrop-filter)", () => {
    for (const util of ["glass", "glass-soft", "glass-floating"]) {
      const block = new RegExp(`@utility ${util}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(tokens);
      expect(block, `@utility ${util} not found`).not.toBeNull();
      expect(block![1]).not.toMatch(/backdrop-filter/);
    }
  });

  it("no component uses a backdrop-blur utility", () => {
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
