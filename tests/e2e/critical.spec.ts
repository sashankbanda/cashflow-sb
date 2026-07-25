import { expect, test, type BrowserContext } from "@playwright/test";

/**
 * The critical user journeys (03-ARCHITECTURE §7) at 390×844. Requires a running
 * server seeded with the e2e users (see docs/RUNBOOK.md). The email sign-in
 * endpoint is dev/preview-only, which is how these authenticate.
 */

const EMAIL = "e2e@cashflow.local";
const PASSWORD = "cashflow-e2e-password-1";

async function signIn(context: BrowserContext): Promise<void> {
  const res = await context.request.post("/api/auth/sign-in/email", {
    data: { email: EMAIL, password: PASSWORD },
  });
  expect(res.ok(), "sign-in endpoint reachable (dev/preview build)").toBeTruthy();
}

test("health check reports ok with the DB reachable", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("ok");
});

test("sign-in screen renders", async ({ page }) => {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/Cashflow|Sign in|Continue with Google/i).first()).toBeVisible();
});

test("authenticated home shows the net position", async ({ page, context }) => {
  await signIn(context);
  await page.goto("/home", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Net position")).toBeVisible();
  await expect(page.getByText("This month")).toBeVisible();
});

test("journey: add a personal expense and see it in the ledger", async ({ page, context }) => {
  await signIn(context);
  const description = `E2E coffee ${Date.now()}`;

  await page.goto("/home", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Add expense" }).click();
  const flow = page.locator('[role="dialog"]');
  await flow.waitFor();

  // ₹250, default context is Personal from the dock.
  for (const digit of ["2", "5", "0"]) {
    await flow.getByRole("button", { name: digit, exact: true }).click();
  }
  await flow.getByPlaceholder("What was it for?").fill(description);
  await flow
    .getByRole("button", { name: /Add expense/ })
    .first()
    .click();
  await page.waitForSelector('[role="dialog"]', { state: "detached" });

  await page.goto("/expenses", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(description)).toBeVisible();
});

test("journey: insights and search reflect real data", async ({ page, context }) => {
  await signIn(context);

  await page.goto("/insights", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Total spend")).toBeVisible();
  await expect(page.getByText("By category", { exact: true })).toBeVisible();

  await page.goto("/search", { waitUntil: "domcontentloaded" });
  const input = page.getByLabel("Search");
  await input.click();
  await input.pressSequentially("lunch", { delay: 50 });
  await expect(page.getByText("Expenses", { exact: true })).toBeVisible({ timeout: 15_000 });
});
