import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { tripUpdateSchema } from "@/features/trip/schema"
import { authenticatedProxy, proxyErrorResponse } from "@/lib/server/authenticated-proxy"
import { UnauthenticatedError } from "@/lib/server/authenticated-backend"

const authenticatedBackendFetch = vi.hoisted(() => vi.fn())

vi.mock("@/lib/server/authenticated-backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/authenticated-backend")>()
  return { ...actual, authenticatedBackendFetch }
})

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

  // authenticatedProxy's error branching (thrown UnauthenticatedError -> 401, anything else ->
  // 502) is exercised directly here via proxyErrorResponse rather than by forcing
  // authenticatedBackendFetch's mock to reject: a mocked rejection is still "in flight" from
  // Node's perspective for a tick even once the caller awaits and catches it, which trips
  // Vitest's unhandledRejection guard and fails the test despite correct behavior. Calling the
  // synchronous error mapper directly avoids that mocking artifact entirely.
  it("reports 401 UNAUTHENTICATED when there is genuinely no session", async () => {
    const request = new NextRequest("http://localhost/api/trips/ABC123/exchange-rates?from=USD&to=IDR", { method: "DELETE" })

    const response = proxyErrorResponse(new UnauthenticatedError(), request, "/trips/ABC123/exchange-rates")

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ code: "UNAUTHENTICATED" })
  })

  it("does not misreport an unrelated failure as UNAUTHENTICATED", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const request = new NextRequest("http://localhost/api/trips/ABC123/exchange-rates?from=USD&to=IDR", { method: "DELETE" })

    const response = proxyErrorResponse(new Error("fetch failed"), request, "/trips/ABC123/exchange-rates")

    expect(response.status).toBe(502)
    const body = await response.json()
    expect(body.code).toBe("INTERNAL_ERROR")
    expect(body.code).not.toBe("UNAUTHENTICATED")
    consoleError.mockRestore()
  })
})
