import { defineConfig } from "@playwright/test";

/**
 * E2E suite for the critical journeys at phone size. Runs against an already
 * running server (dev on :3001 locally, or a preview deploy via E2E_BASE_URL)
 * seeded with the e2e users. See docs/RUNBOOK.md.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
    viewport: { width: 390, height: 844 },
    trace: "on-first-retry",
  },
});
