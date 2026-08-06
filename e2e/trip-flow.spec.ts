import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const password = "Password1";

async function register(context: BrowserContext, email: string, name: string) {
  const page = await context.newPage();
  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });
  return page;
}

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });
}

test("planner creates and updates a trip, invites a member, and join remains idempotent", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const plannerContext = await browser.newContext();
  const memberContext = await browser.newContext();
  const joinerContext = await browser.newContext();
  const plannerEmail = "playwright-planner@example.invalid";
  const memberEmail = "playwright-member@example.invalid";
  const joinerEmail = "playwright-joiner@example.invalid";

  const planner = await register(plannerContext, plannerEmail, "Planner");
  const member = await register(memberContext, memberEmail, "Member");
  const joiner = await register(joinerContext, joinerEmail, "Joiner");

  // The test server intentionally uses a four-second access-token TTL to cover
  // refresh behavior, so authenticate each actor immediately before its flow.
  await planner.goto("/trip/create");
  await signIn(planner, plannerEmail);
  await planner.goto("/trip/create");
  await planner.getByLabel("Trip name").fill("Playwright Trip");
  await planner.getByLabel("Start").fill("2026-08-24");
  await planner.getByLabel("End").fill("2026-08-28");
  await planner.getByRole("button", { name: "Create trip" }).click();
  await expect(planner).toHaveURL(/\/trip\/[A-Za-z0-9]{6}\/settings/, {
    timeout: 30_000,
  });

  const code = planner.url().match(/\/trip\/([^/]+)/)?.[1];
  expect(code).toHaveLength(6);
  await planner.goto(`/trip/${code}/settings`);
  await planner.request.get(`/api/trips/${code}/invitations`);
  await signIn(planner, plannerEmail);
  await planner.goto(`/trip/${code}/settings`);
  await planner.getByPlaceholder("friend@example.com").fill(memberEmail);
  await planner.getByRole("button", { name: "Invite" }).click();
  await expect(planner.getByText("Participant added")).toBeVisible();

  // Precompile the expenses route before refreshing the deliberately
  // four-second access token used by this test server.
  await planner.goto(`/trip/${code}/expenses`);
  await planner.request.get(`/api/trips/${code}/expenses`);
  await signIn(planner, plannerEmail);
  await planner.goto(`/trip/${code}/expenses`);
  await planner.getByRole("button", { name: "Add expense" }).click();
  await planner.getByLabel("Description").fill("Multi-payer dinner");
  await planner.getByLabel("Date").fill("2026-08-25");
  await planner.getByLabel("Amount").fill("12000.00");
  await planner.getByLabel("Payer 1 amount").fill("8000.00");
  await planner.getByRole("button", { name: "Add payer" }).click();
  await planner.getByLabel("Payer 2").selectOption({ label: "Member" });
  await planner.getByLabel("Payer 2 amount").fill("4000.00");
  await planner.getByRole("button", { name: "Save expense" }).click();
  const dinner = planner.getByRole("row").filter({ hasText: "Multi-payer dinner" });
  await expect(dinner).toHaveCount(1);
  await expect(dinner).toContainText("Planner");
  await expect(dinner).toContainText("Member");

  // Precompile the overview before authenticating against the deliberately
  // short-lived test access token.
  await member.goto(`/trip/${code}`);
  await signIn(member, memberEmail);
  await member.goto(`/trip/${code}`);
  await expect(member.getByRole("heading", { name: "Playwright Trip" })).toBeVisible();
  await signIn(member, memberEmail);
  const denied = await member.request.patch(`/api/trips/${code}`, {
    data: {
      name: "Denied",
      baseCurrency: "USD",
      editPermission: "everyone",
      approvalRequiredExpenses: false,
      approvalRequiredSettlements: true,
      multiCurrencyEnabled: true,
      allowSettlementBeforeEnd: true,
      version: 1,
    },
  });
  expect(denied.status()).toBe(403);

  await joiner.goto(`/trip/${code}`);
  await signIn(joiner, joinerEmail);
  await joiner.goto(`/trip/${code}`);
  await joiner.getByRole("button", { name: "Join trip" }).click();
  await expect(joiner.getByRole("heading", { name: "Playwright Trip" })).toBeVisible();
  await signIn(joiner, joinerEmail);
  const duplicate = await joiner.request.post(`/api/trips/${code}/join`);
  expect(duplicate.status()).toBe(409);

  await Promise.all([
    plannerContext.close(),
    memberContext.close(),
    joinerContext.close(),
  ]);
});
