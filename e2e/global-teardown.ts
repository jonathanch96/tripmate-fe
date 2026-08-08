import { execFileSync } from "node:child_process"
import path from "node:path"

export default function globalTeardown() {
  const cwd = path.resolve(import.meta.dirname, "../../jblabs-tripmate-be")
  execFileSync("docker", ["compose", "exec", "-T", "postgres", "psql", "-U", "tripmate", "-d", "tripmate", "-c", "DELETE FROM tripmate.trips WHERE planner_id IN (SELECT id FROM tripmate.users WHERE email IN ('playwright-session@example.invalid','playwright-planner@example.invalid','playwright-member@example.invalid','playwright-joiner@example.invalid','playwright-money-planner@example.invalid','playwright-money-member@example.invalid')); DELETE FROM tripmate.users WHERE email IN ('playwright-session@example.invalid','playwright-planner@example.invalid','playwright-member@example.invalid','playwright-joiner@example.invalid','playwright-money-planner@example.invalid','playwright-money-member@example.invalid');"], {
    cwd,
    stdio: "inherit",
  })
  execFileSync("docker", ["compose", "stop", "postgres"], {
    cwd,
    stdio: "inherit",
  })
}
