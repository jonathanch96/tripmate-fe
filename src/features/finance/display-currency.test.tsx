import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DisplayCurrencySelect, useDisplayCurrency } from "@/features/finance/display-currency"

const apiFetch = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api-client", () => ({ apiFetch }))

const rates = [
  { id: "r1", from: "MYR", to: "IDR", rate: "4365", isFinal: false, source: "manual" },
  { id: "r2", from: "SGD", to: "IDR", rate: "13940", isFinal: false, source: "manual" },
]

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

// A stand-in for the pages that read money through the hook: one headline figure and the
// approximation that belongs under it.
function Probe() {
  const display = useDisplayCurrency("ABC123", "IDR")
  return (
    <div>
      <DisplayCurrencySelect display={display} />
      <p data-testid="primary">{display.primary("1055832")}</p>
      <p data-testid="secondary">{display.secondary("1055832") ?? "none"}</p>
    </div>
  )
}

describe("useDisplayCurrency", () => {
  afterEach(cleanup)
  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockResolvedValue({ success: true, data: rates })
  })

  it("leads with the trip's first non-base currency and keeps the base as the approximation", async () => {
    render(<Probe />, { wrapper: Wrapper })
    await waitFor(() => expect(screen.getByTestId("primary").textContent).toBe("MYR 241.89"))
    expect(screen.getByTestId("secondary").textContent).toBe("≈ IDR 1,055,832")
    expect((screen.getByLabelText("Display currency") as HTMLSelectElement).value).toBe("MYR")
  })

  it("switches both figures when another currency is chosen", async () => {
    render(<Probe />, { wrapper: Wrapper })
    await waitFor(() => expect(screen.getByLabelText("Display currency")).toBeTruthy())
    fireEvent.change(screen.getByLabelText("Display currency"), { target: { value: "SGD" } })

    await waitFor(() => expect(screen.getByTestId("primary").textContent).toBe("SGD 75.74"))
    expect(screen.getByTestId("secondary").textContent).toBe("≈ IDR 1,055,832")
  })

  it("drops the second line when the reader asks for the base currency only", async () => {
    render(<Probe />, { wrapper: Wrapper })
    await waitFor(() => expect(screen.getByLabelText("Display currency")).toBeTruthy())
    fireEvent.change(screen.getByLabelText("Display currency"), { target: { value: "IDR" } })

    await waitFor(() => expect(screen.getByTestId("primary").textContent).toBe("IDR 1,055,832"))
    expect(screen.getByTestId("secondary").textContent).toBe("none")
  })

  it("stays on the base currency, with no picker, when the trip has no other currency", async () => {
    apiFetch.mockResolvedValue({ success: true, data: [] })
    render(<Probe />, { wrapper: Wrapper })

    await waitFor(() => expect(screen.getByTestId("primary").textContent).toBe("IDR 1,055,832"))
    expect(screen.getByTestId("secondary").textContent).toBe("none")
    expect(screen.queryByLabelText("Display currency")).toBeNull()
  })
})
