import type { Trip } from "@/features/trip/types"

export type TripWindow = Pick<Trip, "startDate" | "endDate">

// Today as the calendar day the user is actually living in. toISOString() alone would report the
// UTC day, which is already tomorrow (or still yesterday) for a good part of the world.
export function todayISO(now = new Date()): string {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

// The backend only accepts an expense or settlement dated within a week of the trip, so a default
// of "today" has to be pulled back inside the window for a trip that has not started yet, or one
// being settled up long after it ended.
export function clampToTripDates(day: string, trip: TripWindow): string {
  if (day < trip.startDate) return trip.startDate
  if (day > trip.endDate) return trip.endDate
  return day
}
