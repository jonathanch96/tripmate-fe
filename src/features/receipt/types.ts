import type { Expense, MoneyRow } from "@/features/expense/types"
import type { definitions, paths } from "@/types/api"

export type ReceiptContract = definitions["receipt.receiptResponse"]
export type ReceiptItemContract = definitions["receipt.itemResponse"]
export type ReceiptUploadOperation = paths["/trips/{code}/receipts"]["post"]

export type ReceiptStatus = "uploaded" | "extracting" | "extracted" | "failed" | "converted"

export type ReceiptItem = {
  id: string
  receiptId: string
  name: string
  quantity: string
  unitPrice: string
  totalPrice: string
  sortOrder: number
  assigneeIds: string[]
}

export type Receipt = {
  id: string
  tripId: string
  expenseId: string | null
  uploadedBy: string
  contentType: string
  sizeBytes: number
  merchant: string | null
  receiptDate: string | null
  currency: string | null
  subtotal: string | null
  tax: string | null
  serviceCharge: string | null
  total: string | null
  provider: string | null
  providerModel: string | null
  status: ReceiptStatus
  failureReason: string | null
  imageUrl?: string
  discrepancy: boolean
  items: ReceiptItem[]
  createdAt: string
  updatedAt: string
}

export type UserShare = { userId: string; itemsSubtotal: string; tax: string; serviceCharge: string; total: string }
export type ShareBreakdown = {
  currency: string
  itemsTotal: string
  tax: string
  serviceCharge: string
  total: string
  perUser: UserShare[]
  unassignedItems: string[]
  discrepancy: boolean
}

export type ItemInput = Partial<Pick<ReceiptItem, "name" | "quantity" | "unitPrice" | "totalPrice">>
export type ConvertPayload = { description: string; expenseDate: string; payers: MoneyRow[] }
export type ConvertedExpense = Expense
