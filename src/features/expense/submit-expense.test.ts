import { describe, expect, it, vi } from "vitest"

import { submitExpense } from "@/features/expense/submit-expense"

describe("submitExpense", () => {
  it("issues exactly one POST for a multi-payer expense", async () => {
    const api = vi.fn().mockResolvedValue({ success: true, data: { id: "expense-1" } })
    const payload = {
      expenseDate: "2026-08-06",
      description: "Dinner",
      amount: "12000.00",
      currency: "PHP",
      splitType: "equal" as const,
      payers: [
        { userId: crypto.randomUUID(), amount: "8000.00" },
        { userId: crypto.randomUUID(), amount: "4000.00" },
      ],
      participants: [crypto.randomUUID(), crypto.randomUUID()],
    }

    await submitExpense("ABC123", payload, api)

    expect(api).toHaveBeenCalledTimes(1)
    expect(api).toHaveBeenCalledWith("/api/trips/ABC123/expenses", expect.objectContaining({ method: "POST" }))
  })
})
