"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { LoadingState } from "@/components/ui/spinner"
import { ExpenseDialog } from "@/features/expense/components/expense-dialog"
import { ExpenseFilters } from "@/features/expense/components/expense-filters"
import { ExpenseTable } from "@/features/expense/components/expense-table"
import { listExpenseCategories } from "@/features/expense/category-api"
import { submitExpense } from "@/features/expense/submit-expense"
import { updateExpense } from "@/features/expense/api"
import type { Expense, ExpensePayload } from "@/features/expense/types"
import { useTrip } from "@/features/trip/trip-context"
import { apiFetch } from "@/lib/api-client"
import type { Pagination } from "@/lib/envelope"
import { apiErrorMessage } from "@/lib/envelope"
import { qk } from "@/lib/query-keys"

export function ExpensesPage() {
  const { trip, participants } = useTrip()
  const search = useSearchParams(), router = useRouter(), pathname = usePathname(), queryClient = useQueryClient()
  const [editing, setEditing] = useState<Expense | null>(null)
  const query = useQuery({
    queryKey: [...qk.expenses(trip.code), search.toString()],
    queryFn: () => apiFetch<Expense[]>(`/api/trips/${trip.code}/expenses?${search}`),
  })
  const categories = useQuery({ queryKey: qk.expenseCategories(trip.code), queryFn: async () => (await listExpenseCategories(trip.code)).data ?? [] })
  async function refresh() { await Promise.all([queryClient.invalidateQueries({ queryKey: qk.expenses(trip.code) }), queryClient.invalidateQueries({ queryKey: qk.balances(trip.code) }), queryClient.invalidateQueries({ queryKey: qk.finalSettlement(trip.code) })]) }
  const create = useMutation({ mutationFn: (payload: ExpensePayload) => submitExpense(trip.code, payload), onSuccess: async () => { toast.success("Expense added"); await refresh() }, onError: (error) => toast.error(apiErrorMessage(error, "Could not add expense")) })
  const update = useMutation({ mutationFn: ({ expense, payload }: { expense: Expense; payload: ExpensePayload }) => updateExpense(trip.code, expense.id, { ...payload, version: expense.version }), onSuccess: async () => { setEditing(null); toast.success("Expense updated"); await refresh() }, onError: (error) => toast.error(apiErrorMessage(error, "Could not update expense")) })
  const action = useMutation({ mutationFn: ({ expense, action, body }: { expense: Expense; action: "approve" | "reject" | "delete"; body?: unknown }) => apiFetch(`/api/trips/${trip.code}/expenses/${expense.id}${action === "delete" ? "" : `/${action}`}`, { method: action === "delete" ? "DELETE" : "POST", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }), onSuccess: refresh, onError: (error) => toast.error(apiErrorMessage(error, "Could not update expense")) })
  const expenses = query.data?.data ?? []
  const pagination = query.data?.meta.pagination as Pagination | undefined
  const currencies = [...new Set([trip.baseCurrency, ...expenses.map((expense) => expense.currency)])]
  function goToPage(page: number) {
    const params = new URLSearchParams(search)
    if (page > 1) params.set("page", String(page)); else params.delete("page")
    router.replace(`${pathname}?${params}`)
  }
  return <section>
    <div className="mb-[22px] flex items-end justify-between">
      <div>
        <h1 className="font-heading text-[26px] font-extrabold">Expenses</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Record each bill once, even when several people paid.</p>
      </div>
      <ExpenseDialog trip={trip} participants={participants} pending={create.isPending} onSubmit={(payload) => create.mutate(payload)} onReceiptConverted={refresh} />
    </div>
    {editing ? <ExpenseDialog key={editing.id} trip={trip} participants={participants} expense={editing} open onOpenChange={(open) => { if (!open) setEditing(null) }} pending={update.isPending} onSubmit={(payload) => update.mutate({ expense: editing, payload })} /> : null}
    <div className="mb-5"><ExpenseFilters participants={participants} currencies={currencies} categories={categories.data ?? []} /></div>
    {query.isLoading ? <LoadingState label="Loading expenses…" /> : <>
      <ExpenseTable trip={trip} expenses={expenses} categories={categories.data ?? []} participants={participants} pendingAction={action.isPending || update.isPending} hasAnyExpenses={(pagination?.totalItems ?? 0) > 0} onEdit={setEditing} onDelete={(expense) => action.mutate({ expense, action: "delete" })} onApprove={(expense) => action.mutate({ expense, action: "approve" })} onReject={(expense) => { const reason = window.prompt("Why is this expense rejected?"); if (reason) action.mutate({ expense, action: "reject", body: { reason } }) }} />
      {pagination && pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-[13px] text-muted-foreground">
          <span>Page {pagination.page} of {pagination.totalPages} · {pagination.totalItems} expense{pagination.totalItems === 1 ? "" : "s"}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => goToPage(pagination.page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => goToPage(pagination.page + 1)}>Next</Button>
          </div>
        </div>
      ) : null}
    </>}
  </section>
}
