import { describe, expect, it } from "vitest"

import { registrationDestination } from "@/features/auth/register-form"

describe("registrationDestination", () => {
  it("surfaces pending invitations after registration without accepting them", () => {
    expect(registrationDestination({
      success: true,
      code: "USER_REGISTERED",
      data: { pendingInvitations: [{ token: "still-pending" }] },
    })).toBe("/trips?invitations=pending")
  })

  it("lands on the trip list rather than the marketing page when there are no invitations", () => {
    expect(registrationDestination({ success: true, code: "USER_REGISTERED", data: { pendingInvitations: [] } })).toBe("/trips")
  })
})
