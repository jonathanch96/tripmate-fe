import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";

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

// This environment runs a deliberately four-second access token. The BFF reads that token straight
// off the session cookie, and only NextAuth's own session endpoint runs the callback that rotates
// it — so ping that endpoint immediately before anything that talks to the backend.
async function rotateSession(page: Page) {
  const response = await page.request.get("/api/auth/session");
  expect(response.ok()).toBeTruthy();
}

async function visit(page: Page, email: string, path: string) {
  await page.goto(path);
  await signIn(page, email);
  await rotateSession(page);
  await page.goto(path);
}

// The dev server compiles each route handler on its first hit, which takes long enough to burn the
// four-second token and turn the first real call into a 401. Compile them all up front — the
// status does not matter, only that the module is built. A GET compiles every method in the file.
async function warmRoutes(page: Page, code: string) {
  const anyId = "00000000-0000-0000-0000-000000000000";
  const paths = [
    `/api/trips/${code}`,
    `/api/trips/${code}/participants`,
    `/api/trips/${code}/invitations`,
    `/api/trips/${code}/expenses`,
    `/api/trips/${code}/balances`,
    `/api/trips/${code}/settlements`,
    `/api/trips/${code}/settlements/${anyId}`,
    `/api/trips/${code}/settlements/${anyId}/approve`,
    `/api/trips/${code}/settlements/${anyId}/reject`,
    `/api/trips/${code}/exchange-rates`,
    `/api/trips/${code}/final-settlement`,
    `/api/trips/${code}/finalize`,
    `/api/trips/${code}/unfinalize`,
  ];
  for (const path of paths) await page.request.get(path).catch(() => undefined);
  for (const page_ of [`/trip/${code}`, `/trip/${code}/expenses`, `/trip/${code}/settlements`, `/trip/${code}/final`, `/trip/${code}/settings`]) {
    await page.goto(page_).catch(() => undefined);
  }
}

// A page whose data comes from client-side queries can lose the race against that four-second
// token, which leaves the query sitting in an error state rather than retrying. Reload with a
// freshly rotated cookie until the expected content is really there.
async function loadUntilVisible(page: Page, path: string, target: (page: Page) => Locator) {
  await expect
    .poll(
      async () => {
        await rotateSession(page);
        await page.goto(path);
        return target(page)
          .first()
          .waitFor({ state: "visible", timeout: 10_000 })
          .then(() => true)
          .catch(() => false);
      },
      { timeout: 90_000, intervals: [500, 1_000, 2_000] },
    )
    .toBe(true);
}

// Test-plan item 12: expense → balance → settle → approve → balance shrinks → finalize → plan.
test("money flows from an expense through settlement approval into a finalized transfer plan", async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const plannerContext = await browser.newContext();
  const memberContext = await browser.newContext();
  const plannerEmail = "playwright-money-planner@example.invalid";
  const memberEmail = "playwright-money-member@example.invalid";

  const planner = await register(plannerContext, plannerEmail, "MoneyPlanner");
  const member = await register(memberContext, memberEmail, "MoneyMember");

  // Trip defaults matter here: expenses need no approval, settlements do, and early settlement is
  // allowed — which is exactly the path this test walks.
  await visit(planner, plannerEmail, "/trip/create");
  await planner.request.get("/api/trips").catch(() => undefined);
  await planner.getByLabel("Trip name").fill("Money Flow Trip");
  await planner.getByLabel("Base currency").fill("USD");
  await planner.getByLabel("Start").fill("2026-08-24");
  await planner.getByLabel("End").fill("2026-08-28");
  await rotateSession(planner);
  await planner.getByRole("button", { name: "Create trip" }).click();
  await expect(planner).toHaveURL(/\/trip\/[A-Za-z0-9]{6}\/settings/, { timeout: 30_000 });

  const code = planner.url().match(/\/trip\/([^/]+)/)?.[1];
  expect(code).toHaveLength(6);
  await warmRoutes(planner, code!);

  await loadUntilVisible(planner, `/trip/${code}/settings`, (page) => page.getByPlaceholder("friend@example.com"));
  await planner.getByPlaceholder("friend@example.com").fill(memberEmail);
  await rotateSession(planner);
  await planner.getByRole("button", { name: "Invite" }).click();
  await expect(planner.getByText("Participant added")).toBeVisible({ timeout: 20_000 });

  // One 100.00 expense paid entirely by the planner and split equally: the member owes 50.00.
  await loadUntilVisible(planner, `/trip/${code}/expenses`, (page) => page.getByRole("button", { name: "Add expense" }));
  await planner.getByRole("button", { name: "Add expense" }).click();
  const expenseDialog = planner.getByRole("dialog");
  await expenseDialog.getByLabel("Description").fill("Shared taxi");
  await expenseDialog.getByLabel("Date", { exact: true }).fill("2026-08-25");
  await expenseDialog.getByLabel("Amount", { exact: true }).fill("100.00");
  await expenseDialog.getByLabel("Payer 1 amount").fill("100.00");
  await rotateSession(planner);
  await expenseDialog.getByRole("button", { name: "Save expense" }).click();
  await expect(planner.getByRole("row").filter({ hasText: "Shared taxi" })).toHaveCount(1, { timeout: 20_000 });

  // The dashboard is where the balance becomes visible.
  await loadUntilVisible(planner, `/trip/${code}`, (page) => page.getByText("is owed USD 50.00"));
  await expect(planner.getByText("owes USD 50.00")).toBeVisible();
  await expect(planner.getByText("MoneyMember → MoneyPlanner")).toBeVisible();

  // "Settle this" prefills the record dialog from the debt itself, and the over-settlement guard
  // must land inline in that dialog rather than as a toast.
  await loadUntilVisible(planner, `/trip/${code}/settlements`, (page) => page.getByRole("button", { name: "Settle this" }));
  await planner.getByRole("button", { name: "Settle this" }).click();
  const overDialog = planner.getByRole("dialog");
  await expect(overDialog.getByLabel("Amount")).toHaveValue("50.00");
  await overDialog.getByLabel("Amount").fill("999.00");
  await rotateSession(planner);
  await overDialog.getByRole("button", { name: "Record settlement" }).click();
  await expect(overDialog.getByRole("alert")).toContainText("outstanding debt", { timeout: 20_000 });

  await loadUntilVisible(planner, `/trip/${code}/settlements`, (page) => page.getByRole("button", { name: "Settle this" }));
  await planner.getByRole("button", { name: "Settle this" }).click();
  const recordDialog = planner.getByRole("dialog");
  await recordDialog.getByLabel("Amount").fill("20.00");
  await recordDialog.getByLabel("Method").selectOption("cash");
  await rotateSession(planner);
  await recordDialog.getByRole("button", { name: "Record settlement" }).click();
  await expect(recordDialog).toBeHidden({ timeout: 20_000 });

  // Approval is required on this trip, so it lands pending and the balance has not moved yet.
  const pendingRow = planner.getByRole("row").filter({ hasText: "USD 20.00" });
  await expect(pendingRow).toContainText("pending");
  await expect(planner.getByText("MoneyMember owes MoneyPlanner")).toContainText("50.00");

  await loadUntilVisible(planner, `/trip/${code}/settlements`, (page) => page.getByRole("button", { name: "Approve" }));
  const settlementRow = planner.getByRole("row").filter({ hasText: "USD 20.00" });
  await rotateSession(planner);
  await settlementRow.getByRole("button", { name: "Approve" }).click();
  await expect(settlementRow).toContainText("approved", { timeout: 20_000 });

  // Approving immediately shrinks the outstanding debt: 50.00 - 20.00.
  await expect(planner.getByText("MoneyMember owes MoneyPlanner")).toContainText("30.00", { timeout: 20_000 });
  await loadUntilVisible(planner, `/trip/${code}`, (page) => page.getByText("is owed USD 30.00"));

  // A member may read the plan but must not be offered the planner-only finalize action.
  await visit(member, memberEmail, `/trip/${code}/final`);
  await warmRoutes(member, code!);
  await loadUntilVisible(member, `/trip/${code}/final`, (page) => page.getByText("Optimized transfer plan"));
  await expect(member.getByRole("button", { name: "Finalize trip" })).toHaveCount(0);

  await loadUntilVisible(planner, `/trip/${code}/final`, (page) => page.getByText("MoneyMember → MoneyPlanner"));
  await expect(planner.getByText("USD 30.00")).toBeVisible();

  // Finalizing goes through a confirmation dialog that spells out the consequences.
  await planner.getByRole("button", { name: "Finalize trip" }).click();
  const confirmDialog = planner.getByRole("alertdialog");
  await expect(confirmDialog).toContainText("locks the effective exchange rates");
  await rotateSession(planner);
  await confirmDialog.getByRole("button", { name: "Finalize trip" }).click();

  await expect(planner.getByText("Finalized")).toBeVisible({ timeout: 30_000 });
  await expect(planner.getByRole("button", { name: "Unfinalize trip" })).toBeVisible();
  // The snapshotted plan survives finalization unchanged.
  await expect(planner.getByText("USD 30.00")).toBeVisible();

  // FX-8: once the trip is finalized, mutations are refused with TRIP_FINALIZED. Setting a rate is
  // the cleanest probe — it needs no participant ids, so nothing can fail validation first.
  await rotateSession(planner);
  const blocked = await planner.request.put(`/api/trips/${code}/exchange-rates`, {
    data: { from: "EUR", to: "USD", rate: "1.10" },
  });
  expect(blocked.status()).toBe(403);
  expect((await blocked.json()).code).toBe("TRIP_FINALIZED");

  await Promise.all([plannerContext.close(), memberContext.close()]);
});
