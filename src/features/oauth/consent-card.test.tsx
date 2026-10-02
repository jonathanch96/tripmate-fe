import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ConsentCard } from "@/features/oauth/consent-card"
import { ApiError } from "@/lib/envelope"

const apiFetch = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api-client", () => ({ apiFetch }))
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { email: "ana@example.com" } } }), signOut: vi.fn() }))

const request = {
  id: "r1",
  client: { name: "Claude", clientUri: null, logoUri: null },
  redirectHost: "claude.ai",
  scopes: ["tripmate.read", "tripmate.write"],
  expiresAt: "2026-10-02T10:00:00Z",
}

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function envelope(code: string) {
  return { success: false, code, message: code, data: null, meta: {}, errors: [], traceId: "t", timestamp: "" }
}

describe("ConsentCard", () => {
  const assign = vi.fn()
  afterEach(cleanup)
  beforeEach(() => {
    apiFetch.mockReset()
    assign.mockReset()
    Object.defineProperty(window, "location", { value: { ...window.location, assign }, writable: true })
  })

  it("shows the app and grants read-only access when create and edit is unticked", async () => {
    apiFetch.mockImplementation((path: string) =>
      path === "/api/oauth/requests/r1"
        ? Promise.resolve({ success: true, data: request })
        : Promise.resolve({ success: true, data: { redirectUrl: "https://claude.ai/api/mcp/auth_callback?code=c" } }),
    )
    render(<ConsentCard requestId="r1" />, { wrapper: Wrapper })

    expect(await screen.findByText("Claude")).toBeTruthy()
    expect(screen.getByText(/ana@example.com/)).toBeTruthy()
    expect(screen.getByText(/sent back to claude.ai/)).toBeTruthy()
    fireEvent.click(screen.getByLabelText("Allow creating and editing"))
    fireEvent.click(screen.getByRole("button", { name: "Allow" }))

    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://claude.ai/api/mcp/auth_callback?code=c"))
    const approve = apiFetch.mock.calls.find(([path]) => path === "/api/oauth/requests/r1/approve")
    expect(JSON.parse(approve![1].body)).toEqual({ scopes: ["tripmate.read"] })
  })

  it("sends the user back with a denial", async () => {
    apiFetch.mockImplementation((path: string) =>
      path === "/api/oauth/requests/r1"
        ? Promise.resolve({ success: true, data: request })
        : Promise.resolve({ success: true, data: { redirectUrl: "https://claude.ai/cb?error=access_denied" } }),
    )
    render(<ConsentCard requestId="r1" />, { wrapper: Wrapper })
    fireEvent.click(await screen.findByRole("button", { name: "Deny" }))

    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://claude.ai/cb?error=access_denied"))
    expect(apiFetch).toHaveBeenCalledWith("/api/oauth/requests/r1/deny", { method: "POST" })
  })

  it("explains an expired request instead of offering buttons", async () => {
    apiFetch.mockRejectedValue(new ApiError(envelope("OAUTH_REQUEST_EXPIRED"), 410))
    render(<ConsentCard requestId="r1" />, { wrapper: Wrapper })

    expect(await screen.findByText("This request has expired")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Allow" })).toBeNull()
  })

  it("never fetches anything for an untrusted entry error", () => {
    render(<ConsentCard entryError="invalid_redirect_uri" />, { wrapper: Wrapper })

    expect(screen.getByText("This connection was stopped")).toBeTruthy()
    expect(apiFetch).not.toHaveBeenCalled()
  })
})
