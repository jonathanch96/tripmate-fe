import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ChangePasswordDialog } from "@/features/auth/change-password-dialog"

const apiFetch = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api-client", () => ({ apiFetch }))

const profile = { id: "u1", name: "Jonathan", email: "jonathan@example.com", hasPassword: true }

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function fillNewPassword() {
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: "Str0ng!pass" } })
  fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "Str0ng!pass" } })
}

describe("ChangePasswordDialog", () => {
  afterEach(cleanup)
  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockImplementation((path: string) =>
      path === "/api/users/me"
        ? Promise.resolve({ success: true, data: profile })
        : Promise.resolve({ success: true, data: null }),
    )
  })

  it("opens from its own trigger when nothing else is driving it", async () => {
    render(<ChangePasswordDialog trigger={<button type="button">Change password</button>} />, { wrapper: Wrapper })
    expect(screen.queryByRole("dialog")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Change password" }))
    expect(await screen.findByLabelText("New password")).toBeTruthy()
  })

  it("renders no trigger of its own when a caller controls it", () => {
    const { rerender } = render(<ChangePasswordDialog open={false} onOpenChange={() => {}} />, { wrapper: Wrapper })
    expect(screen.queryByRole("button", { name: "Change password" })).toBeNull()
    expect(screen.queryByRole("dialog")).toBeNull()

    rerender(<ChangePasswordDialog open onOpenChange={() => {}} />)
    expect(screen.getByLabelText("New password")).toBeTruthy()
  })

  it("reports a close back to the caller that owns the open state", async () => {
    const onOpenChange = vi.fn()
    render(<ChangePasswordDialog open onOpenChange={onOpenChange} />, { wrapper: Wrapper })

    fireEvent.click(await screen.findByRole("button", { name: "Close" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("asks an account that has a password to re-enter it", async () => {
    render(<ChangePasswordDialog open onOpenChange={() => {}} />, { wrapper: Wrapper })
    await waitFor(() => expect(screen.getByLabelText("Current password")).toBeTruthy())
    expect(screen.getByRole("heading", { name: "Change password" })).toBeTruthy()

    fillNewPassword()
    fireEvent.click(screen.getByRole("button", { name: "Change password" }))

    // Nothing is sent until the current password is filled in.
    await waitFor(() => expect(screen.getByText("Current password is required")).toBeTruthy())
    expect(apiFetch).not.toHaveBeenCalledWith("/api/users/me/password", expect.anything())

    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "0ld!password" } })
    fireEvent.click(screen.getByRole("button", { name: "Change password" }))
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/api/users/me/password", expect.anything()))
    const body = JSON.parse(String((apiFetch.mock.calls.find(([path]) => path === "/api/users/me/password")![1] as RequestInit).body))
    expect(body.currentPassword).toBe("0ld!password")
  })

  it("lets a Google-only account set its first password without one", async () => {
    apiFetch.mockImplementation((path: string) =>
      path === "/api/users/me"
        ? Promise.resolve({ success: true, data: { ...profile, hasPassword: false } })
        : Promise.resolve({ success: true, data: null }),
    )
    render(<ChangePasswordDialog open onOpenChange={() => {}} />, { wrapper: Wrapper })

    await waitFor(() => expect(screen.getByRole("heading", { name: "Set a password" })).toBeTruthy())
    expect(screen.queryByLabelText("Current password")).toBeNull()

    fillNewPassword()
    fireEvent.click(screen.getByRole("button", { name: "Set password" }))

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/api/users/me/password", expect.anything()))
    const body = JSON.parse(String((apiFetch.mock.calls.find(([path]) => path === "/api/users/me/password")![1] as RequestInit).body))
    expect(body.newPassword).toBe("Str0ng!pass")
    expect(body.currentPassword ?? "").toBe("")
  })

  it("keeps asking for the current password while the profile is still loading", () => {
    apiFetch.mockImplementation(() => new Promise(() => {}))
    render(<ChangePasswordDialog open onOpenChange={() => {}} />, { wrapper: Wrapper })
    expect(screen.getByLabelText("Current password")).toBeTruthy()
  })
})
