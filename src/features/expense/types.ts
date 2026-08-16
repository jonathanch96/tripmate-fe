export type MoneyRow = { userId: string; amount: string; weight?: string }

export type SplitType = "equal" | "manual" | "percent" | "shares"

export type ExpenseCategory = { id: string; tripId: string | null; name: string; isDefault: boolean }

export type ExpensePayload = {
  expenseDate: string
  description: string
  amount: string
  currency: string
  // What the payer's card or account actually showed, when it differs from `currency`. An empty
  // string on chargedCurrency is the explicit "clear it" signal; omitting both leaves it as-is.
  chargedAmount?: string
  chargedCurrency?: string
  categoryId?: string | null
  splitType: SplitType
  payers: MoneyRow[]
  participants?: string[]
  splits?: MoneyRow[]
  note?: string | null
}

export type Expense = {
  id: string
  tripId: string
  categoryId: string | null
  expenseDate: string
  description: string
  amount: string
  currency: string
  chargedAmount: string | null
  chargedCurrency: string | null
  splitType: "equal" | "manual" | "item" | "percent" | "shares"
  status: "pending" | "approved" | "rejected"
  source: "manual" | "receipt"
  note: string | null
  payers: Array<MoneyRow & { user?: { id: string; name: string; email: string } }>
  splits: Array<MoneyRow & { user?: { id: string; name: string; email: string } }>
  canEdit: boolean
  canDelete: boolean
  canApprove: boolean
  canReject: boolean
  version: number
  createdAt: string
  updatedAt: string
}
