import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ExpenseTable } from "@/features/expense/components/expense-table"
import type { Expense } from "@/features/expense/types"
import type { Participant, Trip } from "@/features/trip/types"

const apiFetch = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api-client", () => ({ apiFetch }))

const trip: Trip = {
  id: "trip-1", code: "ABC123", name: "Bali Trip", baseCurrency: "THB",
  startDate: "2026-08-01", endDate: "2026-08-10", plannerId: "user-1", isFinalized: false, isArchived: false,
  settings: { editPermission: "everyone", approvalRequiredExpenses: false, approvalRequiredSettlements: true, multiCurrencyEnabled: true, allowSettlementBeforeEnd: true },
  version: 1, canEditSettings: true,
}

const participants: Participant[] = [
  { id: "p1", tripId: trip.id, userId: "u1", role: "planner", displayName: null, bankInfo: null, user: { id: "u1", name: "Jonathan", email: "jonathan@example.com", hasAccount: true, hasLoggedIn: true } },
]

function baseExpense(overrides: Partial<Expense>): Expense {
  return {
    id: "e1", tripId: trip.id, categoryId: null, expenseDate: "2026-08-06", description: "Dinner",
    amount: "1500.00", currency: "THB", chargedAmount: null, chargedCurrency: null,
    splitType: "equal", status: "approved", source: "manual", note: null,
    payers: [{ userId: "u1", amount: "1500.00" }], splits: [{ userId: "u1", amount: "1500.00" }],
    canEdit: true, canDelete: true, canApprove: false, canReject: false,
    version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const noop = () => {}

describe("ExpenseTable", () => {
  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockImplementation((path: string) => {
      if (path.includes("exchange-rates")) return Promise.resolve({ success: true, data: [{ id: "r1", from: "THB", to: "IDR", rate: "450", isFinal: false }] })
      return Promise.resolve({ success: true, data: [] })
    })
  })

  it("shows no secondary line for an expense already in the trip's base currency", () => {
    const expenses = [baseExpense({})]
    render(<ExpenseTable trip={trip} expenses={expenses} categories={[]} participants={participants} pendingAction={false} onEdit={noop} onDelete={noop} onApprove={noop} onReject={noop} />, { wrapper: Wrapper })
    expect(screen.getByText("THB 1,500.00")).toBeTruthy()
    expect(screen.queryByText(/≈/)).toBeNull()
  })

  it("shows the exact charged-amount override as the base-currency line when one is set", async () => {
    const expenses = [baseExpense({ currency: "IDR", amount: "1500.00", chargedAmount: "84000.00", chargedCurrency: "THB" })]
    render(<ExpenseTable trip={trip} expenses={expenses} categories={[]} participants={participants} pendingAction={false} onEdit={noop} onDelete={noop} onApprove={noop} onReject={noop} />, { wrapper: Wrapper })
    expect(await screen.findByText("≈ THB 84,000.00")).toBeTruthy()
  })

  it("falls back to the trip's saved rate when there's no charged-amount override", async () => {
    const expenses = [baseExpense({ currency: "IDR", amount: "450.00", chargedAmount: null, chargedCurrency: null })]
    render(<ExpenseTable trip={trip} expenses={expenses} categories={[]} participants={participants} pendingAction={false} onEdit={noop} onDelete={noop} onApprove={noop} onReject={noop} />, { wrapper: Wrapper })
    // 1 THB = 450 IDR, so IDR 450 converts to THB 1.00 at the saved rate.
    await waitFor(() => expect(screen.getByText("≈ THB 1.00")).toBeTruthy())
  })
})
