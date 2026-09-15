import { clampToTripDates, todayISO, type TripWindow } from "@/features/trip/trip-dates"
import type { Trip } from "@/features/trip/types"

const storageKey = (tripCode: string) => `tripmate:last-expense-date:${tripCode}`
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Kept per trip in this browser only — it is a typing convenience, not trip data, so it never
// goes to the server and never leaks between trips. Storage can be unavailable (private mode, a
// blocked origin), in which case the default simply falls back to today.
export function readLastExpenseDate(tripCode: string): string | null {
  if (typeof window === "undefined") return null
  try {
    const stored = window.localStorage.getItem(storageKey(tripCode))
    return stored && ISO_DATE.test(stored) ? stored : null
  } catch {
    return null
  }
}

export function rememberLastExpenseDate(tripCode: string, date: string) {
  if (typeof window === "undefined" || !ISO_DATE.test(date)) return
  try {
    window.localStorage.setItem(storageKey(tripCode), date)
  } catch {
    // Nothing to do — the next expense just defaults to today again.
  }
}

// Today the first time, then whatever day the last expense was filed for: a day's receipts get
// entered in one sitting, often well after that day, and retyping the date each time is the part
// that grates.
export function defaultExpenseDate(trip: Pick<Trip, "code"> & TripWindow, now?: Date): string {
  return readLastExpenseDate(trip.code) ?? clampToTripDates(todayISO(now), trip)
}
