import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { tripUpdateSchema } from "@/features/trip/schema"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

const authenticatedBackendFetch = vi.hoisted(() => vi.fn())

vi.mock("@/lib/server/authenticated-backend", () => ({ authenticatedBackendFetch }))

const validUpdate = {
  name: "Review Trip",
  baseCurrency: "USD",
  editPermission: "everyone",
  approvalRequiredExpenses: true,
  approvalRequiredSettlements: false,
  multiCurrencyEnabled: true,
  allowSettlementBeforeEnd: false,
  version: 2,
}

describe("authenticatedProxy", () => {
  beforeEach(() => authenticatedBackendFetch.mockReset())

  it("rejects invalid bodies before contacting the backend", async () => {
    const request = new NextRequest("http://localhost/api/trips/ABC123", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Request-ID": "validation-trace" },
      body: JSON.stringify({ ...validUpdate, unexpected: true }),
    })

    const response = await authenticatedProxy(request, "/trips/ABC123", tripUpdateSchema)

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "VALIDATION_FAILED", traceId: "validation-trace" })
    expect(authenticatedBackendFetch).not.toHaveBeenCalled()
  })

  it("forwards only the parsed, snake-case contract", async () => {
    authenticatedBackendFetch.mockResolvedValue({
      status: 200,
      envelope: {
        success: true,
        code: "OK",
        message: "Updated",
        data: { version: 3 },
        meta: {},
        errors: [],
      },
    })
    const request = new NextRequest("http://localhost/api/trips/ABC123", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validUpdate),
    })

    const response = await authenticatedProxy(request, "/trips/ABC123", tripUpdateSchema)

    expect(response.status).toBe(200)
    expect(authenticatedBackendFetch).toHaveBeenCalledWith(
      request,
      "/trips/ABC123",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          name: "Review Trip",
          base_currency: "USD",
          edit_permission: "everyone",
          approval_required_expenses: true,
          approval_required_settlements: false,
          multi_currency_enabled: true,
          allow_settlement_before_end: false,
          version: 2,
        }),
      }),
    )
  })
})
