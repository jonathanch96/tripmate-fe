import { expect, test } from "@playwright/test"

test("session survives reload, remains server-only, and refreshes once under concurrency", async ({ page, context }) => {
  const email = "playwright-session@example.invalid"
  await page.goto("/register")
  await page.getByLabel("Name").fill("Playwright User")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill("Password1")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL("/")

  const initial = await page.request.get("/api/auth/session")
  const initialSession = await initial.json()
  expect(initialSession.user.email).toBe(email)
  expect(JSON.stringify(initialSession)).not.toMatch(/accessToken|refreshToken|access_token|refresh_token/)

  const sessionCookie = (await context.cookies()).find((cookie) => cookie.name.includes("session-token"))
  expect(sessionCookie?.httpOnly).toBe(true)
  const browserStorage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))
  expect(browserStorage).not.toMatch(/access|refresh/i)

  await page.reload()
  await expect.poll(async () => (await (await page.request.get("/api/auth/session")).json()).user?.email).toBe(email)

  const sessions = await page.evaluate(async () => Promise.all(
    Array.from({ length: 8 }, async () => (await fetch("/api/auth/session", { cache: "no-store" })).json()),
  ))
  for (const session of sessions) {
    expect(session.user.email).toBe(email)
    expect(session.error).toBeUndefined()
  }
})
