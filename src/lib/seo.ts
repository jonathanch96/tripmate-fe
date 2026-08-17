const DEFAULT_SITE_URL = "http://localhost:3000"

export const SITE_NAME = "TripMate"

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "")

export const SITE_TAGLINE = "Know Exactly Who Owes Who"

export const SITE_DESCRIPTION =
  "Every expense, every currency, every payment — tracked automatically so settling up takes one glance, not a group chat argument."
