"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { ExpenseDialog } from "@/features/expense/components/expense-dialog"
import { ExpenseFilters } from "@/features/expense/components/expense-filters"
import { ExpenseTable } from "@/features/expense/components/expense-table"
import { submitExpense } from "@/features/expense/submit-expense"
import type { Expense, ExpensePayload } from "@/features/expense/types"
import { useTrip } from "@/features/trip/trip-context"
import { apiFetch } from "@/lib/api-client"
import { qk } from "@/lib/query-keys"

export function ExpensesPage() {
  const { trip, participants } = useTrip()
  const search = useSearchParams(), queryClient = useQueryClient()
  const query = useQuery({ queryKey: [...qk.expenses(trip.code), search.toString()], queryFn: async () => (await apiFetch<Expense[]>(`/api/trips/${trip.code}/expenses?${search}`)).data ?? [] })
  async function refresh() { await Promise.all([queryClient.invalidateQueries({ queryKey: qk.expenses(trip.code) }), queryClient.invalidateQueries({ queryKey: qk.balances(trip.code) }), queryClient.invalidateQueries({ queryKey: qk.finalSettlement(trip.code) })]) }
  const create = useMutation({ mutationFn: (payload: ExpensePayload) => submitExpense(trip.code, payload), onSuccess: async () => { toast.success("Expense added"); await refresh() }, onError: () => toast.error("Could not add expense") })
  const action = useMutation({ mutationFn: ({ expense, action, body }: { expense: Expense; action: "approve" | "reject" | "delete"; body?: unknown }) => apiFetch(`/api/trips/${trip.code}/expenses/${expense.id}${action === "delete" ? "" : `/${action}`}`, { method: action === "delete" ? "DELETE" : "POST", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }), onSuccess: refresh, onError: () => toast.error("Could not update expense") })
  const currencies = [...new Set([trip.baseCurrency, ...(query.data ?? []).map((expense) => expense.currency)])]
  return <section className="space-y-5"><div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">Expenses</h2><p className="text-sm text-muted-foreground">Record each bill once, even when several people paid.</p></div><ExpenseDialog trip={trip} participants={participants} pending={create.isPending} onSubmit={(payload) => create.mutate(payload)} /></div><ExpenseFilters participants={participants} currencies={currencies} />{query.isLoading ? <p>Loading expenses…</p> : <ExpenseTable expenses={query.data ?? []} planner={trip.canEditSettings} pendingAction={action.isPending} onDelete={(expense) => action.mutate({ expense, action: "delete" })} onApprove={(expense) => action.mutate({ expense, action: "approve" })} onReject={(expense) => { const reason = window.prompt("Why is this expense rejected?"); if (reason) action.mutate({ expense, action: "reject", body: { reason } }) }} />}</section>
}
