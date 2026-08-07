export type PublicUser = { id: string; name: string; email: string; avatarUrl?: string | null }
export type Transfer = { fromUserId: string; toUserId: string; amount: string; currency: string; bankName?: string | null; bankAccountNumber?: string | null; bankAccountHolder?: string | null }
export type ParticipantBalance = { userId: string; user: PublicUser; totalPaid: string; totalOwed: string; netBalance: string }
export type BalanceResult = {
  baseCurrency: string
  balances: ParticipantBalance[]
  debts: Transfer[]
  summary: { totalExpenses: string; totalSettled: string; expenseCount: number; settlementCount: number; pendingExpenseCount: number; pendingSettlementCount: number; unsettledTotal: string }
  ratesUsed: { from: string; to: string; rate: string; isFinal: boolean }[]
}
export type Settlement = { id: string; fromUserId: string; toUserId: string; amount: string; currency: string; method: "cash" | "bank_transfer"; status: "pending" | "approved" | "rejected"; note?: string | null; fromUser?: PublicUser | null; toUser?: PublicUser | null }
export type Rate = { id: string; from: string; to: string; rate: string; isFinal: boolean; source: string }
export type FinalPlan = { baseCurrency: string; transfers: Transfer[] }
