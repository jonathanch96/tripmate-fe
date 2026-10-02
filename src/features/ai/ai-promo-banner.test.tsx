import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AiPromoBanner } from "@/features/ai/ai-promo-banner"

const apiFetch = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api-client", () => ({ apiFetch }))

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe("AiPromoBanner", () => {
  afterEach(cleanup)
  beforeEach(() => {
    apiFetch.mockReset()
    window.localStorage.clear()
  })

  it("announces the feature, links to the guide, and stays dismissed", async () => {
    apiFetch.mockResolvedValue({ success: true, data: [] })
    render(<AiPromoBanner />, { wrapper: Wrapper })

    expect(await screen.findByText("Split bills with Claude or ChatGPT")).toBeTruthy()
    expect(screen.getByRole("link", { name: /See how/ }).getAttribute("href")).toBe("/ai")
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))
    await waitFor(() => expect(screen.queryByText("Split bills with Claude or ChatGPT")).toBeNull())
    expect(window.localStorage.getItem("tripmate:ai-promo-dismissed")).toBe("1")

    cleanup()
    render(<AiPromoBanner />, { wrapper: Wrapper })
    expect(screen.queryByText("Split bills with Claude or ChatGPT")).toBeNull()
  })

  it("stays out of the way once an assistant is connected", async () => {
    apiFetch.mockResolvedValue({ success: true, data: [{ id: "g1", client: { name: "Claude" }, scopes: [], createdAt: "", lastUsedAt: "" }] })
    render(<AiPromoBanner />, { wrapper: Wrapper })

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/api/oauth/grants"))
    expect(screen.queryByText("Split bills with Claude or ChatGPT")).toBeNull()
  })
})
