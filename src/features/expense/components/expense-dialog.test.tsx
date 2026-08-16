import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ExpenseDialog, expenseFormFromExpense } from "@/features/expense/components/expense-dialog"
import type { Expense } from "@/features/expense/types"
import type { Participant, Trip } from "@/features/trip/types"

const apiFetch = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api-client", () => ({ apiFetch }))

const trip: Trip = {
  id: "trip-1", code: "ABC123", name: "Bali Trip", baseCurrency: "THB",
  startDate: "2026-08-01", endDate: "2026-08-10", plannerId: "user-1", isFinalized: false,
  settings: { editPermission: "everyone", approvalRequiredExpenses: false, approvalRequiredSettlements: true, multiCurrencyEnabled: true, allowSettlementBeforeEnd: true },
  version: 1, canEditSettings: true,
}

const participants: Participant[] = [
  { id: "p1", tripId: trip.id, userId: "u1", role: "planner", displayName: null, bankInfo: null, user: { id: "u1", name: "Jonathan", email: "jonathan@example.com", hasAccount: true } },
  { id: "p2", tripId: trip.id, userId: "u2", role: "participant", displayName: null, bankInfo: null, user: { id: "u2", name: "Elisabeth", email: "elisabeth@example.com", hasAccount: true } },
]

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe("ExpenseDialog", () => {
  afterEach(cleanup)
  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockImplementation((path: string) => {
      if (path.includes("exchange-rates")) return Promise.resolve({ success: true, data: [{ id: "r1", from: "THB", to: "IDR", rate: "450", isFinal: false }] })
      if (path.includes("categories")) return Promise.resolve({ success: true, data: [] })
      return Promise.resolve({ success: true, data: [] })
    })
  })

  it("shows the computed shares split amount", async () => {
    render(<ExpenseDialog trip={trip} participants={participants} pending={false} open onOpenChange={() => {}} onSubmit={() => {}} />, { wrapper: Wrapper })
    fireEvent.change(screen.getByLabelText(/amount \(thb\)/i), { target: { value: "1500000" } })
    fireEvent.click(screen.getByRole("button", { name: "Shares" }))
    fireEvent.change(screen.getByLabelText(/shares for jonathan/i), { target: { value: "5" } })
    fireEvent.change(screen.getByLabelText(/shares for elisabeth/i), { target: { value: "2" } })
    await waitFor(() => expect(screen.getByText("1071428.57")).toBeTruthy())
    expect(screen.getByText("428571.43")).toBeTruthy()
  })

  it("keeps the base amount and currency unchanged when toggling 'actually charged in'", async () => {
    render(<ExpenseDialog trip={trip} participants={participants} pending={false} open onOpenChange={() => {}} onSubmit={() => {}} />, { wrapper: Wrapper })
    fireEvent.change(screen.getByLabelText(/amount \(thb\)/i), { target: { value: "1500" } })
    fireEvent.click(await screen.findByText("+ I actually paid in a different currency"))
    expect(screen.getByLabelText(/amount \(thb\)/i)).toHaveProperty("value", "1500")
    fireEvent.change(screen.getByLabelText("Amount actually charged"), { target: { value: "675000" } })
    expect(screen.getByLabelText(/amount \(thb\)/i)).toHaveProperty("value", "1500")
    await waitFor(() => expect(screen.getByText(/1 THB = 450/i)).toBeTruthy())
  })

  it("pre-fills a persisted charged amount/currency when editing", async () => {
    const expense: Expense = {
      id: "e1", tripId: trip.id, categoryId: null, expenseDate: "2026-08-06", description: "Dinner",
      amount: "1500.00", currency: "THB", chargedAmount: "675000.00", chargedCurrency: "IDR",
      splitType: "equal", status: "approved", source: "manual", note: null,
      payers: [{ userId: "u1", amount: "1500.00" }],
      splits: [{ userId: "u1", amount: "750.00" }, { userId: "u2", amount: "750.00" }],
      canEdit: true, canDelete: true, canApprove: false, canReject: false,
      version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    render(<ExpenseDialog trip={trip} participants={participants} expense={expense} pending={false} open onOpenChange={() => {}} onSubmit={() => {}} />, { wrapper: Wrapper })
    expect(screen.getByLabelText(/amount \(thb\)/i)).toHaveProperty("value", "1500.00")
    expect(await screen.findByLabelText("Amount actually charged")).toHaveProperty("value", "675000.00")
    await waitFor(() => expect(screen.getByLabelText("Currency actually charged")).toHaveProperty("value", "IDR"))
  })

  it("carries chargedAmount/chargedCurrency through expenseFormFromExpense", () => {
    const expense: Expense = {
      id: "e1", tripId: trip.id, categoryId: null, expenseDate: "2026-08-06", description: "Dinner",
      amount: "1500.00", currency: "THB", chargedAmount: "675000.00", chargedCurrency: "IDR",
      splitType: "equal", status: "approved", source: "manual", note: null,
      payers: [{ userId: "u1", amount: "1500.00" }],
      splits: [{ userId: "u1", amount: "750.00" }, { userId: "u2", amount: "750.00" }],
      canEdit: true, canDelete: true, canApprove: false, canReject: false,
      version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    const form = expenseFormFromExpense(expense)
    expect(form.chargedAmount).toBe("675000.00")
    expect(form.chargedCurrency).toBe("IDR")
  })
})
