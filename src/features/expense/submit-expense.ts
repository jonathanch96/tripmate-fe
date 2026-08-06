import { apiFetch } from "@/lib/api-client"
import type { Envelope } from "@/lib/envelope"
import type { Expense, ExpensePayload } from "@/features/expense/types"

type Api = <T>(path: string, init?: RequestInit) => Promise<Envelope<T>>

export async function submitExpense(code: string, payload: ExpensePayload, api: Api = apiFetch) {
  return api<Expense>(`/api/trips/${encodeURIComponent(code)}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}
