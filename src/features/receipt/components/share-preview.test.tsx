import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SharePreview } from "@/features/receipt/components/share-preview"

describe("SharePreview", () => {
  it("renders the server breakdown without deriving amounts in the browser", () => {
    render(<SharePreview loading={false} participants={[{ id: "p1", tripId: "t1", userId: "u1", role: "participant", bankInfo: null, user: { id: "u1", name: "Ana", email: "ana@example.com", hasAccount: true } }]} shares={{ currency: "PHP", itemsTotal: "99.99", tax: "12.34", serviceCharge: "4.56", total: "116.89", unassignedItems: [], discrepancy: false, perUser: [{ userId: "u1", itemsSubtotal: "31.11", tax: "7.77", serviceCharge: "2.22", total: "41.10" }] }} />)
    for (const value of ["Ana", "31.11", "7.77", "2.22", "41.10"]) expect(screen.getByText(value)).toBeTruthy()
  })
})
