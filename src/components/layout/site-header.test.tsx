import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SiteHeader } from "@/components/layout/site-header"

vi.mock("@/lib/api-client", () => ({ apiFetch: vi.fn() }))
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  useSession: () => ({ data: { user: { id: "u1", name: "Jonathan", email: "jonathan@example.com" } }, status: "authenticated" }),
}))

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe("SiteHeader account menu", () => {
  afterEach(cleanup)

  // The dialog used to be rendered inside the dropdown's own content, so choosing "Change
  // password" closed the menu and unmounted the dialog with it — it flashed open and vanished.
  it("keeps the change-password dialog open after the menu that opened it closes", async () => {
    render(<SiteHeader />, { wrapper: Wrapper })
    fireEvent.click(screen.getByRole("button", { name: /Jonathan/ }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Change password" }))

    const dialog = await screen.findByRole("dialog")
    expect(dialog.textContent).toContain("Change password")
    // The menu is on its way out; the dialog has to survive it.
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
    expect(screen.getByRole("dialog")).toBeTruthy()
    expect(screen.getByLabelText("Current password")).toBeTruthy()
  })
})
