import path from "node:path"
import { defineConfig, devices } from "@playwright/test"

const frontendURL = "http://localhost:3100"
const backendURL = "http://localhost:18081"
const backendDirectory = path.resolve(import.meta.dirname, "../jblabs-tripmate-be")
const managedServers = process.env.PLAYWRIGHT_EXTERNAL_SERVERS !== "true"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? frontendURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: managedServers ? [
    {
      command: "POSTGRES_HOST_PORT=55432 docker compose up -d --wait postgres && PATH=/usr/local/go/bin:$PATH make migrate-up && docker compose exec -T postgres psql -U tripmate -d tripmate -c \"DELETE FROM tripmate.trips WHERE planner_id IN (SELECT id FROM tripmate.users WHERE email IN ('playwright-session@example.invalid','playwright-planner@example.invalid','playwright-member@example.invalid','playwright-joiner@example.invalid')); DELETE FROM tripmate.users WHERE email IN ('playwright-session@example.invalid','playwright-planner@example.invalid','playwright-member@example.invalid','playwright-joiner@example.invalid');\" && APP_PORT=18081 JWT_ACCESS_TTL=4s PATH=/usr/local/go/bin:$PATH go run ./adapters/rest",
      cwd: backendDirectory,
      url: `${backendURL}/readyz`,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: "pnpm dev --port 3100",
      url: frontendURL,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        BACKEND_BASE_URL: backendURL,
        NEXTAUTH_URL: frontendURL,
        NEXTAUTH_SECRET: "playwright-nextauth-secret-at-least-32-bytes",
      },
    },
  ] : undefined,
  globalTeardown: managedServers ? "./e2e/global-teardown.ts" : undefined,
})
