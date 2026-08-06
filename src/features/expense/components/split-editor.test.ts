import { describe, expect, it } from "vitest"

import { equalPreview } from "@/features/expense/components/split-editor"

describe("equalPreview", () => {
  it.each([
    ["100.00", "PHP", ["00000000-0000-0000-0000-000000000003", "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"], ["33.34", "33.33", "33.33"]],
    ["0.01", "PHP", ["a", "b", "c"], ["0.01", "0.00", "0.00"]],
    ["1000", "IDR", ["a", "b", "c"], ["334", "333", "333"]],
  ])("splits %s %s deterministically", (amount, currency, ids, expected) => {
    expect([...equalPreview(amount, currency, ids).values()]).toEqual(expected)
  })
})
