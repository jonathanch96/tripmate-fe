export const qk = {
  all: ["tripmate"] as const,
  trips: () => [...qk.all, "trips"] as const,
  trip: (tripCode: string) => [...qk.trips(), tripCode] as const,
  participants: (tripCode: string) => [...qk.trip(tripCode), "participants"] as const,
  invitations: (tripCode: string) => [...qk.trip(tripCode), "invitations"] as const,
  myInvitations: () => [...qk.all, "invitations", "me"] as const,
  expenses: (tripCode: string) => [...qk.trip(tripCode), "expenses"] as const,
  balances: (tripCode: string) => [...qk.trip(tripCode), "balances"] as const,
  finalSettlement: (tripCode: string) => [...qk.trip(tripCode), "final-settlement"] as const,
}
