import { describe, expect, it } from "vitest"

import { camelize, decamelize } from "@/lib/case"

describe("boundary case conversion", () => {
  it("deeply converts objects and arrays", () => {
    const wire = { trace_id: "trace", data: [{ trip_code: "abc123", nested_value: { user_id: "u1" } }] }
    expect(camelize(wire)).toEqual({ traceId: "trace", data: [{ tripCode: "abc123", nestedValue: { userId: "u1" } }] })
  })

  it("round-trips JSON-shaped camelCase data", () => {
    const value = { tripCode: "abc123", payerRows: [{ userId: "u1", paidAmount: "10.00" }] }
    expect(camelize(decamelize(value))).toEqual(value)
  })
})

