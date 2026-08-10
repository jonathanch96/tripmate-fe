import { describe, expect, it, vi } from "vitest"

import { updateExpense } from "@/features/expense/api"
import { expenseFormFromExpense } from "@/features/expense/components/expense-dialog"
import type { Expense } from "@/features/expense/types"

const expense: Expense = {
  id: crypto.randomUUID(), tripId: crypto.randomUUID(), categoryId: null, expenseDate: "2026-08-06",
  description: "Dinner", amount: "12000.00", currency: "PHP", splitType: "manual",
  status: "approved", source: "manual", note: "Team meal", canEdit: true, canDelete: true, canApprove: false, canReject: false,
  version: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  payers: [{ userId: crypto.randomUUID(), amount: "8000.00" }, { userId: crypto.randomUUID(), amount: "4000.00" }],
  splits: [{ userId: crypto.randomUUID(), amount: "6000.00" }, { userId: crypto.randomUUID(), amount: "6000.00" }],
}

describe("expense editing", () => {
  it("repopulates every money row and the optimistic-lock version", () => {
    expect(expenseFormFromExpense(expense)).toEqual({
      expenseDate: "2026-08-06", description: "Dinner", amount: "12000.00", currency: "PHP", categoryId: null,
      splitType: "manual", payers: expense.payers.map(({ userId, amount }) => ({ userId, amount })),
      participants: undefined, splits: expense.splits.map(({ userId, amount }) => ({ userId, amount })),
      note: "Team meal", version: 3,
    })
  })

  it("issues one PATCH containing the existing version", async () => {
    const api = vi.fn().mockResolvedValue({ success: true, data: expense })
    await updateExpense("ABC123", expense.id, { ...expenseFormFromExpense(expense), version: expense.version }, api)
    expect(api).toHaveBeenCalledTimes(1)
    expect(api).toHaveBeenCalledWith(`/api/trips/ABC123/expenses/${expense.id}`, expect.objectContaining({ method: "PATCH", body: expect.stringContaining('"version":3') }))
  })
})
