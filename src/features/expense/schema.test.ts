import { describe, expect, it } from "vitest"

import { expenseCreateSchema } from "@/features/expense/schema"

describe("expenseCreateSchema", () => {
  it("reports incomplete money input without throwing", () => {
    expect(() => expenseCreateSchema.safeParse({
      expenseDate: "2026-08-25", description: "Dinner", amount: "", currency: "PHP",
      splitType: "equal", payers: [{ userId: crypto.randomUUID(), amount: "" }], participants: [crypto.randomUUID()],
    })).not.toThrow()
    expect(expenseCreateSchema.safeParse({
      expenseDate: "2026-08-25", description: "Dinner", amount: "", currency: "PHP",
      splitType: "equal", payers: [{ userId: crypto.randomUUID(), amount: "" }], participants: [crypto.randomUUID()],
    }).success).toBe(false)
  })
})
