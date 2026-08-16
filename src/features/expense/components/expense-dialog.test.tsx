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
    // Let the trip's rates load (and the default-currency effect settle) before pinning THB
    // explicitly - this test is about share math, not currency defaulting.
    await waitFor(() => expect(screen.getByLabelText("Currency").querySelector('option[value="IDR"]')).toBeTruthy())
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "THB" } })
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "1500000" } })
    fireEvent.click(screen.getByRole("button", { name: "Shares" }))
    fireEvent.change(screen.getByLabelText(/shares for jonathan/i), { target: { value: "5" } })
    fireEvent.change(screen.getByLabelText(/shares for elisabeth/i), { target: { value: "2" } })
    await waitFor(() => expect(screen.getByText("1,071,428.57")).toBeTruthy())
    expect(screen.getByText("428,571.43")).toBeTruthy()
  })

  it("defaults a new expense to the trip's other saved currency instead of its base currency", async () => {
    render(<ExpenseDialog trip={trip} participants={participants} pending={false} open onOpenChange={() => {}} onSubmit={() => {}} />, { wrapper: Wrapper })
    await waitFor(() => expect(screen.getByLabelText("Currency")).toHaveProperty("value", "IDR"))
    expect(screen.getByText(/i know exactly what this cost in thb/i)).toBeTruthy()
  })

  it("falls back to the trip's base currency when there's no other saved currency yet", () => {
    apiFetch.mockImplementation((path: string) => {
      if (path.includes("exchange-rates")) return Promise.resolve({ success: true, data: [] })
      if (path.includes("categories")) return Promise.resolve({ success: true, data: [] })
      return Promise.resolve({ success: true, data: [] })
    })
    render(<ExpenseDialog trip={trip} participants={participants} pending={false} open onOpenChange={() => {}} onSubmit={() => {}} />, { wrapper: Wrapper })
    expect(screen.getByLabelText("Currency")).toHaveProperty("value", "THB")
    expect(screen.queryByText(/i know exactly what this cost/i)).toBeNull()
  })

  it("reveals a per-transaction charged-amount override once a foreign currency is picked, and hides it again when switched back to base", async () => {
    render(<ExpenseDialog trip={trip} participants={participants} pending={false} open onOpenChange={() => {}} onSubmit={() => {}} />, { wrapper: Wrapper })
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "1500" } })
    // "IDR" only becomes a selectable option once the trip's saved rates finish loading.
    await waitFor(() => expect(screen.getByLabelText("Currency").querySelector('option[value="IDR"]')).toBeTruthy())
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "IDR" } })
    fireEvent.click(await screen.findByText(/i know exactly what this cost in thb/i))
    const chargedInput = screen.getByLabelText("Amount actually charged in THB")
    fireEvent.change(chargedInput, { target: { value: "84000" } })
    // The entry amount/currency (what's split) is untouched by the override.
    expect(screen.getByLabelText("Amount")).toHaveProperty("value", "1,500")
    await waitFor(() => expect(screen.getByText(/1 IDR = 56/i)).toBeTruthy())

    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "THB" } })
    expect(screen.queryByLabelText("Amount actually charged in THB")).toBeNull()
    expect(screen.queryByText(/i know exactly what this cost/i)).toBeNull()
  })

  it("pre-fills a persisted charged-amount override when editing", async () => {
    const expense: Expense = {
      id: "e1", tripId: trip.id, categoryId: null, expenseDate: "2026-08-06", description: "Dinner",
      amount: "1500.00", currency: "IDR", chargedAmount: "84000.00", chargedCurrency: "THB",
      splitType: "equal", status: "approved", source: "manual", note: null,
      payers: [{ userId: "u1", amount: "1500.00" }],
      splits: [{ userId: "u1", amount: "750.00" }, { userId: "u2", amount: "750.00" }],
      canEdit: true, canDelete: true, canApprove: false, canReject: false,
      version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    render(<ExpenseDialog trip={trip} participants={participants} expense={expense} pending={false} open onOpenChange={() => {}} onSubmit={() => {}} />, { wrapper: Wrapper })
    expect(screen.getByLabelText("Amount")).toHaveProperty("value", "1,500.00")
    expect(screen.getByLabelText("Currency")).toHaveProperty("value", "IDR")
    expect(await screen.findByLabelText("Amount actually charged in THB")).toHaveProperty("value", "84,000.00")
  })

  it("edits an expense already in the trip's base currency with no charged-amount option shown", () => {
    const expense: Expense = {
      id: "e1", tripId: trip.id, categoryId: null, expenseDate: "2026-08-06", description: "Bank transfer",
      amount: "5000.00", currency: "THB", chargedAmount: null, chargedCurrency: null,
      splitType: "equal", status: "approved", source: "manual", note: null,
      payers: [{ userId: "u1", amount: "5000.00" }],
      splits: [{ userId: "u1", amount: "2500.00" }, { userId: "u2", amount: "2500.00" }],
      canEdit: true, canDelete: true, canApprove: false, canReject: false,
      version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    render(<ExpenseDialog trip={trip} participants={participants} expense={expense} pending={false} open onOpenChange={() => {}} onSubmit={() => {}} />, { wrapper: Wrapper })
    expect(screen.getByLabelText("Amount")).toHaveProperty("value", "5,000.00")
    expect(screen.getByLabelText("Currency")).toHaveProperty("value", "THB")
    expect(screen.queryByText(/i know exactly what this cost/i)).toBeNull()
  })

  it("defaults every participant's shares to 0 so only the people actually splitting need a value", async () => {
    render(<ExpenseDialog trip={trip} participants={participants} pending={false} open onOpenChange={() => {}} onSubmit={() => {}} />, { wrapper: Wrapper })
    await waitFor(() => expect(screen.getByLabelText("Currency").querySelector('option[value="IDR"]')).toBeTruthy())
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Group taxi" } })
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "THB" } })
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "1500" } })
    fireEvent.click(screen.getByRole("button", { name: "Shares" }))
    expect(screen.getByLabelText(/shares for jonathan/i)).toHaveProperty("value", "0")
    expect(screen.getByLabelText(/shares for elisabeth/i)).toHaveProperty("value", "0")
    expect(screen.getByText("0.00 total shares")).toBeTruthy()
    // Setting just one participant's shares is enough to produce a valid split total - the other
    // participant's default 0 doesn't need to be touched.
    fireEvent.change(screen.getByLabelText(/shares for jonathan/i), { target: { value: "1" } })
    await waitFor(() => expect(screen.getByText("1.00 total shares")).toBeTruthy())
    expect(screen.getByLabelText(/shares for elisabeth/i)).toHaveProperty("value", "0")
  })

  it("pastes a currency-symbol amount without crashing and sanitizes it", async () => {
    render(<ExpenseDialog trip={trip} participants={participants} pending={false} open onOpenChange={() => {}} onSubmit={() => {}} />, { wrapper: Wrapper })
    const amountInput = screen.getByLabelText("Amount")
    const clipboardData = { getData: () => "฿65.00" }
    fireEvent.paste(amountInput, { clipboardData })
    expect(amountInput).toHaveProperty("value", "65.00")
  })

  it("distributes the remainder to whichever participant is picked in the modal, not just the last row", async () => {
    render(<ExpenseDialog trip={trip} participants={participants} pending={false} open onOpenChange={() => {}} onSubmit={() => {}} />, { wrapper: Wrapper })
    await waitFor(() => expect(screen.getByLabelText("Currency").querySelector('option[value="IDR"]')).toBeTruthy())
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "THB" } })
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "200" } })
    fireEvent.click(screen.getByRole("button", { name: "Exact" }))
    fireEvent.change(screen.getByLabelText(/split for jonathan/i), { target: { value: "100" } })
    fireEvent.click(screen.getByRole("button", { name: "Distribute rest" }))
    fireEvent.click(await screen.findByRole("button", { name: "Elisabeth" }))
    expect(screen.getByLabelText(/split for elisabeth/i)).toHaveProperty("value", "100.00")
    expect(screen.getByLabelText(/split for jonathan/i)).toHaveProperty("value", "100")
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
