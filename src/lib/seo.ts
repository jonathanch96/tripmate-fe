const DEFAULT_SITE_URL = "http://localhost:3000"

export const SITE_NAME = "TripMate"

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "")

export const SITE_TAGLINE = "Split Trip Expenses Without the Hassle"

export const SITE_DESCRIPTION =
  "TripMate records who paid, who shared, and what everyone owes on a group trip, even across multiple currencies, then settles every balance in the smallest practical set of transfers."
