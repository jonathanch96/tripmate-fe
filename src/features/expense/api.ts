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

// Analytics needs every expense to build category/person breakdowns, not one paginated page.
// Loops at the backend's own page-size cap; stops after 10 pages (1000 expenses) so a single
// trip's history can't turn an analytics page load into an unbounded fetch loop.
export async function listAllExpenses(code: string, api: Api = apiFetch): Promise<Expense[]> {
  const all: Expense[] = []
  for (let page = 1; page <= 10; page++) {
    const envelope = await api<Expense[]>(`/api/trips/${encodeURIComponent(code)}/expenses?per_page=100&page=${page}`)
    const rows = envelope.data ?? []
    all.push(...rows)
    const pagination = envelope.meta.pagination as { totalPages: number } | undefined
    if (!pagination || page >= pagination.totalPages || rows.length === 0) break
  }
  return all
}
