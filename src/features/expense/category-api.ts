import type { Envelope } from "@/lib/envelope"
import { apiFetch } from "@/lib/api-client"
import type { ExpenseCategory } from "@/features/expense/types"

type Api = <T>(path: string, init?: RequestInit) => Promise<Envelope<T>>

export async function listExpenseCategories(code: string, api: Api = apiFetch) {
  return api<ExpenseCategory[]>(`/api/trips/${encodeURIComponent(code)}/expense-categories`)
}

export async function createExpenseCategory(code: string, name: string, api: Api = apiFetch) {
  return api<ExpenseCategory>(`/api/trips/${encodeURIComponent(code)}/expense-categories`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
  })
}

export async function deleteExpenseCategory(code: string, id: string, api: Api = apiFetch) {
  return api(`/api/trips/${encodeURIComponent(code)}/expense-categories/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}
