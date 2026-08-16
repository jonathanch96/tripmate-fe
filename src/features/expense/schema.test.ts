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

  it("accepts a percent split whose weights sum to 100", () => {
    const [first, second] = [crypto.randomUUID(), crypto.randomUUID()]
    const result = expenseCreateSchema.safeParse({
      expenseDate: "2026-08-25", description: "Dinner", amount: "100", currency: "PHP",
      splitType: "percent", payers: [{ userId: first, amount: "100" }],
      splits: [{ userId: first, amount: "60", weight: "60" }, { userId: second, amount: "40", weight: "40" }],
    })
    expect(result.success).toBe(true)
  })

  it("rejects a percent split whose weights do not sum to 100", () => {
    const [first, second] = [crypto.randomUUID(), crypto.randomUUID()]
    const result = expenseCreateSchema.safeParse({
      expenseDate: "2026-08-25", description: "Dinner", amount: "100", currency: "PHP",
      splitType: "percent", payers: [{ userId: first, amount: "100" }],
      splits: [{ userId: first, amount: "60", weight: "60" }, { userId: second, amount: "30", weight: "30" }],
    })
    expect(result.success).toBe(false)
  })

  it("accepts a shares split with any positive share counts", () => {
    const [first, second] = [crypto.randomUUID(), crypto.randomUUID()]
    const result = expenseCreateSchema.safeParse({
      expenseDate: "2026-08-25", description: "Dinner", amount: "90", currency: "PHP",
      splitType: "shares", payers: [{ userId: first, amount: "90" }],
      splits: [{ userId: first, amount: "60", weight: "2" }, { userId: second, amount: "30", weight: "1" }],
    })
    expect(result.success).toBe(true)
  })

  it("accepts a shares split where one participant sits it out with a zero share count", () => {
    const [first, second] = [crypto.randomUUID(), crypto.randomUUID()]
    const result = expenseCreateSchema.safeParse({
      expenseDate: "2026-08-25", description: "Dinner", amount: "90", currency: "PHP",
      splitType: "shares", payers: [{ userId: first, amount: "90" }],
      splits: [{ userId: first, amount: "90", weight: "1" }, { userId: second, amount: "0", weight: "0" }],
    })
    expect(result.success).toBe(true)
  })

  it("rejects a shares split where every participant has a zero share count", () => {
    const [first, second] = [crypto.randomUUID(), crypto.randomUUID()]
    const result = expenseCreateSchema.safeParse({
      expenseDate: "2026-08-25", description: "Dinner", amount: "90", currency: "PHP",
      splitType: "shares", payers: [{ userId: first, amount: "90" }],
      splits: [{ userId: first, amount: "0", weight: "0" }, { userId: second, amount: "0", weight: "0" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects a shares split missing a share count for a participant", () => {
    const [first, second] = [crypto.randomUUID(), crypto.randomUUID()]
    const result = expenseCreateSchema.safeParse({
      expenseDate: "2026-08-25", description: "Dinner", amount: "90", currency: "PHP",
      splitType: "shares", payers: [{ userId: first, amount: "90" }],
      splits: [{ userId: first, amount: "90", weight: "1" }, { userId: second, amount: "0" }],
    })
    expect(result.success).toBe(false)
  })
})
