import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CreateTripForm } from "@/features/trip/create-form"

const apiFetch = vi.hoisted(() => vi.fn())
const push = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api-client", () => ({ apiFetch }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText("Trip name"), { target: { value: "Bali Trip" } })
  fireEvent.change(screen.getByLabelText("Start"), { target: { value: "2026-08-24" } })
  fireEvent.change(screen.getByLabelText("End"), { target: { value: "2026-08-28" } })
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Create trip" }))
}

describe("CreateTripForm", () => {
  afterEach(cleanup)
  beforeEach(() => {
    apiFetch.mockReset()
    push.mockReset()
    apiFetch.mockResolvedValue({ success: true, data: { code: "ABC123" } })
  })

  it("creates a trip with approvals off and the always-on settings fixed to true", async () => {
    render(<CreateTripForm />)
    fillRequiredFields()
    submit()

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/api/trips", expect.anything()))
    const body = JSON.parse(String((apiFetch.mock.calls[0][1] as RequestInit).body))
    expect(body).toMatchObject({
      name: "Bali Trip",
      approvalRequiredExpenses: false,
      approvalRequiredSettlements: false,
      multiCurrencyEnabled: true,
      allowSettlementBeforeEnd: true,
    })
    await waitFor(() => expect(push).toHaveBeenCalledWith("/trip/ABC123/settings"))
  })

  it("offers no toggle for the settings that are always on", () => {
    render(<CreateTripForm />)
    expect(screen.queryByText("Allow multiple currencies")).toBeNull()
    expect(screen.queryByText("Allow early settlement")).toBeNull()
  })

  it("saves each drafted exchange rate against the trip it just created", async () => {
    render(<CreateTripForm />)
    fillRequiredFields()
    fireEvent.change(screen.getByLabelText("Base currency"), { target: { value: "IDR" } })
    fireEvent.change(screen.getByLabelText("Currency to add"), { target: { value: "SGD" } })
    // "1 SGD = 13940 IDR" — the inverse direction, which is how a planner actually reads a rate.
    fireEvent.click(screen.getByRole("button", { name: "1 SGD =" }))
    fireEvent.change(screen.getByLabelText("Exchange rate"), { target: { value: "13940" } })
    fireEvent.click(screen.getByRole("button", { name: "Add currency" }))
    expect(screen.getByText("1 SGD = 13940 IDR")).toBeTruthy()

    submit()

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2))
    const [path, init] = apiFetch.mock.calls[1] as [string, RequestInit]
    expect(path).toBe("/api/trips/ABC123/exchange-rates")
    expect(init.method).toBe("PUT")
    expect(JSON.parse(String(init.body))).toEqual({ from: "SGD", to: "IDR", rate: "13940" })
  })

  it("still lands on the new trip when a drafted rate cannot be saved", async () => {
    apiFetch.mockImplementation((path: string) =>
      path.includes("exchange-rates")
        ? Promise.reject(new Error("rate rejected"))
        : Promise.resolve({ success: true, data: { code: "ABC123" } }),
    )
    render(<CreateTripForm />)
    fillRequiredFields()
    fireEvent.change(screen.getByLabelText("Exchange rate"), { target: { value: "1.5" } })
    fireEvent.click(screen.getByRole("button", { name: "Add currency" }))
    submit()

    await waitFor(() => expect(push).toHaveBeenCalledWith("/trip/ABC123/settings"))
  })
})
