import { describe, expect, it } from "vitest"

import { balanceColor, balanceLabel, entryDetail, entryTitle, matchesSign } from "@/features/finance/ledger-page"
import type { LedgerEntry } from "@/features/finance/types"

const names = new Map([["u1", "Ana"], ["u2", "Ben"]])
const categoryName = () => "Food & Drink"

function expenseEntry(overrides: Partial<LedgerEntry>): LedgerEntry {
  return { kind: "expense", date: "2026-08-01", description: "Group dinner", delta: "80", runningBalance: "80", ...overrides }
}

describe("balanceLabel / balanceColor", () => {
  it("reports owed for a clearly positive balance", () => {
    expect(balanceLabel("120", "PHP")).toBe("Owed PHP 120.00")
    expect(balanceColor("120")).toBe("text-success")
  })

  it("reports owes for a clearly negative balance", () => {
    expect(balanceLabel("-45.5", "PHP")).toBe("Owes PHP 45.50")
    expect(balanceColor("-45.5")).toBe("text-destructive")
  })

  it("reports settled up for a balance within rounding noise of zero", () => {
    expect(balanceLabel("0.1", "PHP")).toBe("Settled up")
    expect(balanceColor("-0.2")).toBe("text-muted-foreground")
  })
})

describe("entryTitle", () => {
  it("uses the expense description for expense rows", () => {
    expect(entryTitle(expenseEntry({}), names)).toBe("Group dinner")
  })

  it("labels a sent settlement as 'Settlement to' the counterparty", () => {
    const entry: LedgerEntry = { kind: "settlement", date: "2026-08-02", description: "Settlement", delta: "50", runningBalance: "50", counterpartyUserId: "u2" }
    expect(entryTitle(entry, names)).toBe("Settlement to Ben")
  })

  it("labels a received settlement as 'Settlement from' the counterparty", () => {
    const entry: LedgerEntry = { kind: "settlement", date: "2026-08-02", description: "Settlement", delta: "-50", runningBalance: "-50", counterpartyUserId: "u1" }
    expect(entryTitle(entry, names)).toBe("Settlement from Ana")
  })
})

describe("entryDetail", () => {
  it("shows paid and share when the member both paid and owed a share", () => {
    const entry = expenseEntry({ paid: "120", share: "40", delta: "80" })
    expect(entryDetail(entry, "PHP", categoryName, false, "")).toBe("Food & Drink · Paid PHP 120.00 · share PHP 40.00")
  })

  it("shows 'Paid this expense' when the member paid but has no share", () => {
    const entry = expenseEntry({ paid: "120", share: "0", delta: "120" })
    expect(entryDetail(entry, "PHP", categoryName, false, "")).toBe("Food & Drink · Paid this expense")
  })

  it("shows 'Your share' when the member didn't pay", () => {
    const entry = expenseEntry({ paid: "0", share: "40", delta: "-40" })
    expect(entryDetail(entry, "PHP", categoryName, false, "")).toBe("Food & Drink · Your share")
  })

  it("describes the counterparty's share when filtering and delta is positive", () => {
    const entry = expenseEntry({ delta: "40" })
    expect(entryDetail(entry, "PHP", categoryName, true, "Ben")).toBe("Food & Drink · Ben's share of this expense")
  })

  it("describes the member's own share paid by the counterparty when filtering and delta is negative", () => {
    const entry = expenseEntry({ delta: "-40" })
    expect(entryDetail(entry, "PHP", categoryName, true, "Ben")).toBe("Food & Drink · Your share, paid by Ben")
  })

  it("shows 'You paid' / 'You received' for settlement rows regardless of filtering", () => {
    const sent: LedgerEntry = { kind: "settlement", date: "2026-08-02", description: "Settlement", delta: "50", runningBalance: "50" }
    const received: LedgerEntry = { kind: "settlement", date: "2026-08-02", description: "Settlement", delta: "-50", runningBalance: "-50" }
    expect(entryDetail(sent, "PHP", categoryName, false, "")).toBe("You paid")
    expect(entryDetail(received, "PHP", categoryName, true, "Ben")).toBe("You received")
  })
})

describe("matchesSign", () => {
  const positive = expenseEntry({ delta: "80" })
  const negative = expenseEntry({ delta: "-40" })

  it("passes everything for 'all'", () => {
    expect(matchesSign(positive, "all")).toBe(true)
    expect(matchesSign(negative, "all")).toBe(true)
  })

  it("keeps only credits (owed to you) for 'positive'", () => {
    expect(matchesSign(positive, "positive")).toBe(true)
    expect(matchesSign(negative, "positive")).toBe(false)
  })

  it("keeps only debits (you owe) for 'negative'", () => {
    expect(matchesSign(positive, "negative")).toBe(false)
    expect(matchesSign(negative, "negative")).toBe(true)
  })
})
