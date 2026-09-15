import { afterEach, describe, expect, it } from "vitest"

import { defaultExpenseDate, readLastExpenseDate, rememberLastExpenseDate } from "@/features/expense/last-expense-date"

const trip = { code: "ABC123", startDate: "2026-08-24", endDate: "2026-08-28" }

describe("last expense date", () => {
  afterEach(() => window.localStorage.clear())

  it("starts at today while the trip is running", () => {
    expect(defaultExpenseDate(trip, new Date("2026-08-26T09:00:00"))).toBe("2026-08-26")
  })

  it("pulls today back into a trip that has not started, or already ended", () => {
    expect(defaultExpenseDate(trip, new Date("2026-01-05T09:00:00"))).toBe("2026-08-24")
    expect(defaultExpenseDate(trip, new Date("2027-03-02T09:00:00"))).toBe("2026-08-28")
  })

  it("reuses the date the last expense was filed for, even outside the trip window", () => {
    rememberLastExpenseDate(trip.code, "2025-01-12")
    expect(defaultExpenseDate(trip, new Date("2026-08-26T09:00:00"))).toBe("2025-01-12")
  })

  it("keeps each trip's date to itself", () => {
    rememberLastExpenseDate(trip.code, "2026-08-25")
    expect(readLastExpenseDate("OTHER1")).toBeNull()
    expect(defaultExpenseDate({ ...trip, code: "OTHER1" }, new Date("2026-08-26T09:00:00"))).toBe("2026-08-26")
  })

  it("ignores anything stored that is not a plain date", () => {
    window.localStorage.setItem("tripmate:last-expense-date:ABC123", "not-a-date")
    expect(readLastExpenseDate(trip.code)).toBeNull()
    rememberLastExpenseDate(trip.code, "nonsense")
    expect(readLastExpenseDate(trip.code)).toBeNull()
  })
})
