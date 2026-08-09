import { describe, expect, it } from "vitest"

import { opposingRate } from "@/features/finance/final-page"
import type { Rate } from "@/features/finance/types"

const rate = (from: string, to: string): Rate =>
  ({ id: `${from}-${to}`, from, to, rate: "300", isFinal: false, source: "manual" })

describe("opposingRate", () => {
  const stored = [rate("PHP", "IDR"), rate("USD", "PHP")]

  it("finds the row a draft is about to replace", () => {
    expect(opposingRate(stored, { from: "IDR", to: "PHP" })?.id).toBe("PHP-IDR")
  })

  it("ignores casing and padding when matching the opposite direction", () => {
    expect(opposingRate(stored, { from: " idr ", to: "php" })?.id).toBe("PHP-IDR")
  })

  it("stays quiet when only the same direction is stored", () => {
    expect(opposingRate(stored, { from: "USD", to: "PHP" })).toBeUndefined()
  })

  it("stays quiet for unrelated, empty, and identical pairs", () => {
    expect(opposingRate(stored, { from: "EUR", to: "SGD" })).toBeUndefined()
    expect(opposingRate(stored, { from: "", to: "PHP" })).toBeUndefined()
    expect(opposingRate(stored, { from: "PHP", to: "PHP" })).toBeUndefined()
    expect(opposingRate(undefined, { from: "IDR", to: "PHP" })).toBeUndefined()
  })
})
