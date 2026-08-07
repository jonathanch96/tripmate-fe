import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { MissingRateState, missingRatePairs } from "@/features/finance/missing-rate-state"
import { ApiError, type Envelope } from "@/lib/envelope"

function error() {
  return new ApiError({ success: false, code: "EXCHANGE_RATE_MISSING", message: "Exchange rates required: EUR→PHP, USD→PHP", data: null, meta: {}, errors: [], traceId: "test", timestamp: "2026-08-07T00:00:00Z" } satisfies Envelope<unknown>, 422)
}

describe("MissingRateState", () => {
  afterEach(cleanup)
  it("extracts every missing pair and links directly to prefilled rate controls", () => {
    expect(missingRatePairs(error())).toEqual(["EUR→PHP", "USD→PHP"])
    render(<MissingRateState error={error()} tripCode="SUMMER" />)
    const link = screen.getByRole("link", { name: "Fix exchange rates" })
    expect(link.getAttribute("href")).toContain("/trip/SUMMER/final?")
    expect(decodeURIComponent(link.getAttribute("href") ?? "")).toContain("EUR→PHP,USD→PHP")
  })
})
