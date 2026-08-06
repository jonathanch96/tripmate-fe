import type { Envelope } from "@/lib/envelope"
import { apiFetch } from "@/lib/api-client"
import type { Expense, ExpensePayload } from "@/features/expense/types"

type Api = <T>(path: string, init?: RequestInit) => Promise<Envelope<T>>
export type ExpenseUpdatePayload = ExpensePayload & { version: number }

export async function createExpense(code: string, payload: ExpensePayload, api: Api = apiFetch) {
  return api<Expense>(`/api/trips/${encodeURIComponent(code)}/expenses`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  })
}

export async function updateExpense(code: string, id: string, payload: ExpenseUpdatePayload, api: Api = apiFetch) {
  return api<Expense>(`/api/trips/${encodeURIComponent(code)}/expenses/${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  })
}
