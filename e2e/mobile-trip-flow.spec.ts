import { expect, test } from "@playwright/test"

const email = "playwright-mobile@example.invalid"
const password = "Password1"

test("mobile navigation and expense flow work at 390px", async ({ page }) => {
  test.setTimeout(180_000)

  await page.goto("/register")
  await page.getByLabel("Name").fill("Mobile Traveler")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Create account" }).click()

  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/trips/)
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible()

  await page.getByRole("link", { name: /New trip/ }).click()
  await page.getByLabel("Trip name").fill("Mobile Bali")
  await page.getByLabel("Start").fill("2026-08-24")
  await page.getByLabel("End").fill("2026-08-28")
  await page.getByRole("button", { name: "Create trip" }).click()

  const code = page.url().match(/\/trip\/([^/]+)/)?.[1]
  expect(code).toHaveLength(6)
  await expect(page.getByRole("navigation", { name: "Trip navigation" })).toBeVisible()
  await page.getByRole("link", { name: "Expenses" }).click()
  await page.getByRole("button", { name: "Add expense" }).click()

  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Description").fill("Sunset dinner")
  await dialog.getByLabel("Date", { exact: true }).fill("2026-08-25")
  await dialog.getByLabel("Amount", { exact: true }).fill("120.00")
  await dialog.getByRole("button", { name: "Save expense" }).click()

  await expect(page.getByText("Sunset dinner").first()).toBeVisible()
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll")
})
