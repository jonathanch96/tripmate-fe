import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ChangePasswordDialog } from "@/features/auth/change-password-dialog"

vi.mock("@/lib/api-client", () => ({ apiFetch: vi.fn() }))

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe("ChangePasswordDialog", () => {
  afterEach(cleanup)

  it("opens from its own trigger when nothing else is driving it", async () => {
    render(<ChangePasswordDialog trigger={<button type="button">Change password</button>} />, { wrapper: Wrapper })
    expect(screen.queryByRole("dialog")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Change password" }))
    expect(await screen.findByLabelText("Current password")).toBeTruthy()
  })

  it("renders no trigger of its own when a caller controls it", () => {
    const { rerender } = render(<ChangePasswordDialog open={false} onOpenChange={() => {}} />, { wrapper: Wrapper })
    expect(screen.queryByRole("button", { name: "Change password" })).toBeNull()
    expect(screen.queryByRole("dialog")).toBeNull()

    rerender(<ChangePasswordDialog open onOpenChange={() => {}} />)
    expect(screen.getByLabelText("Current password")).toBeTruthy()
  })

  it("reports a close back to the caller that owns the open state", async () => {
    const onOpenChange = vi.fn()
    render(<ChangePasswordDialog open onOpenChange={onOpenChange} />, { wrapper: Wrapper })

    fireEvent.click(await screen.findByRole("button", { name: "Close" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
