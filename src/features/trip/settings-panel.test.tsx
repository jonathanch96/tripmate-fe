import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SettingsPanel } from "@/features/trip/settings-panel"
import { TripProvider } from "@/features/trip/trip-context"
import type { Participant, Trip } from "@/features/trip/types"

const apiFetch = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api-client", () => ({ apiFetch }))
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } } }),
}))

const trip: Trip = {
  id: "trip-1",
  code: "ABC123",
  name: "Review Trip",
  baseCurrency: "USD",
  startDate: "2026-08-20",
  endDate: "2026-08-25",
  plannerId: "user-1",
  isFinalized: false,
  settings: {
    editPermission: "everyone",
    approvalRequiredExpenses: false,
    approvalRequiredSettlements: true,
    multiCurrencyEnabled: true,
    allowSettlementBeforeEnd: true,
  },
  version: 1,
  canEditSettings: true,
}

const participants: Participant[] = [
  {
    id: "participant-1",
    tripId: trip.id,
    userId: "user-1",
    role: "planner",
    bankInfo: { bankName: "Old Bank", accountNumber: "12345678", accountHolder: "Planner" },
    user: { id: "user-1", name: "Planner", email: "planner@example.com" },
  },
  {
    id: "participant-2",
    tripId: trip.id,
    userId: "user-2",
    role: "participant",
    bankInfo: { bankName: "Member Bank", accountNumber: "••••4321", accountHolder: "Member" },
    user: { id: "user-2", name: "Member", email: "member@example.com" },
  },
]

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <TripProvider trip={trip} participants={participants}>
        {children}
      </TripProvider>
    </QueryClientProvider>
  )
}

describe("SettingsPanel", () => {
  afterEach(cleanup)

  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockResolvedValue({ success: true, data: trip })
  })

  it("renders edit-permission and participant bank controls", () => {
    render(<SettingsPanel />, { wrapper: Wrapper })
    expect(screen.getByLabelText("Edit permission")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Edit bank details for Planner" })).toBeTruthy()
  })

  it("sends only the validated settings update shape", async () => {
    render(<SettingsPanel />, { wrapper: Wrapper })
    fireEvent.click(screen.getByLabelText("Require expense approval"))

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1))
    const init = apiFetch.mock.calls[0][1] as RequestInit
    expect(JSON.parse(String(init.body))).toEqual({
      name: "Review Trip",
      baseCurrency: "USD",
      editPermission: "everyone",
      approvalRequiredExpenses: true,
      approvalRequiredSettlements: true,
      multiCurrencyEnabled: true,
      allowSettlementBeforeEnd: true,
      version: 1,
    })
  })

  it("never seeds an editable account field with a masked account number", () => {
    render(<SettingsPanel />, { wrapper: Wrapper })
    fireEvent.click(screen.getByRole("button", { name: "Edit bank details for Member" }))

    const accountNumber = screen.getByLabelText("Account number") as HTMLInputElement
    expect(accountNumber.value).toBe("")
    expect(accountNumber.placeholder).toBe("Enter a new account number to replace the masked value")
  })

  it("blocks a masked account number at the actual form submission boundary", async () => {
    render(<SettingsPanel />, { wrapper: Wrapper })
    fireEvent.click(screen.getByRole("button", { name: "Edit bank details for Member" }))
    fireEvent.change(screen.getByLabelText("Account number"), { target: { value: "••••4321" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect((await screen.findByRole("alert")).textContent).toContain("Enter the complete account number")
    expect(apiFetch).not.toHaveBeenCalled()
  })
})
