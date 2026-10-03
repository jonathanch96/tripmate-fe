export const OAUTH_SCOPES = ["tripmate.read", "tripmate.write"] as const

export type OAuthScope = (typeof OAUTH_SCOPES)[number]

export const SCOPE_READ: OAuthScope = "tripmate.read"
export const SCOPE_WRITE: OAuthScope = "tripmate.write"

// What each scope lets a connected AI tool do, in the words the consent page and account page use.
export const SCOPE_COPY: Record<OAuthScope, { title: string; detail: string }> = {
  "tripmate.read": {
    title: "See your trips",
    detail: "Trips, participants, expenses, balances and repayments.",
  },
  "tripmate.write": {
    title: "Create and edit",
    detail: "Create trips, add expenses and split bills, record repayments, and add people to trips you plan.",
  },
}

export function accessLabel(scopes: readonly string[]) {
  return scopes.includes(SCOPE_WRITE) ? "Can view and add" : "View only"
}
