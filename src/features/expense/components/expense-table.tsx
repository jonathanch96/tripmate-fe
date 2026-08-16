"use client"

import { useQuery } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { categoryColorFor } from "@/lib/category-colors"
import { formatMoney } from "@/lib/money"
import { participantNameMap } from "@/lib/participant-name"
import { cn } from "@/lib/utils"
import type { Expense, ExpenseCategory } from "@/features/expense/types"
import { convertToBase } from "@/features/finance/rate-pair-helpers"
import type { Rate } from "@/features/finance/types"
import type { Participant, Trip } from "@/features/trip/types"
import { apiFetch } from "@/lib/api-client"
import { qk } from "@/lib/query-keys"

const SPLIT_LABEL: Record<Expense["splitType"], string> = {
  equal: "Equal", manual: "Exact", item: "Itemized", percent: "Percent", shares: "Shares",
}

const STATUS_VARIANT: Record<Expense["status"], "outline" | "secondary" | "destructive"> = {
  pending: "secondary", approved: "outline", rejected: "destructive",
}

// What this expense actually counts toward in the trip's base currency: the per-transaction
// charged-amount override when there is one, otherwise the trip's saved rate. Returns null when
// the expense is already in base currency (nothing extra to show) or no rate is available yet.
function baseAmountLine(expense: Expense, trip: Trip, rates: Rate[]): string | null {
  if (expense.currency === trip.baseCurrency) return null
  if (expense.chargedAmount && expense.chargedCurrency === trip.baseCurrency) {
    return formatMoney(expense.chargedAmount, trip.baseCurrency)
  }
  const converted = convertToBase(expense.amount, trip.baseCurrency, expense.currency, rates)
  return converted ? formatMoney(converted, trip.baseCurrency) : null
}

export function ExpenseTable({ trip, expenses, categories, participants, pendingAction, hasAnyExpenses = true, onEdit, onDelete, onApprove, onReject }: { trip: Trip; expenses: Expense[]; categories: ExpenseCategory[]; participants: Participant[]; pendingAction: boolean; hasAnyExpenses?: boolean; onEdit: (expense: Expense) => void; onDelete: (expense: Expense) => void; onApprove: (expense: Expense) => void; onReject: (expense: Expense) => void }) {
  const names = participantNameMap(participants)
  const rates = useQuery({ queryKey: qk.rates(trip.code), queryFn: async () => (await apiFetch<Rate[]>(`/api/trips/${trip.code}/exchange-rates`)).data ?? [] })
  if (!expenses.length) return (
    <div className="rounded-2xl border-[1.5px] border-dashed border-border px-6 py-16 text-center">
      <p className="mb-1.5 text-[15px] font-bold">No expenses found</p>
      <p className="text-[13px] text-muted-foreground">{hasAnyExpenses ? "Try clearing filters, or log your first bill." : "No expenses yet. Add your first bill to get started."}</p>
    </div>
  )
  const categoryById = new Map(categories.map((category) => [category.id, category.name]))
  return <div className="overflow-hidden rounded-[14px] border border-border bg-white">
    <Table>
      <TableHeader>
        <TableRow className="border-b-border bg-muted hover:bg-muted">
          <TableHead className="h-auto py-3 pl-5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Date</TableHead>
          <TableHead className="h-auto py-3 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Description</TableHead>
          <TableHead className="h-auto py-3 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Category</TableHead>
          <TableHead className="h-auto py-3 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Split</TableHead>
          <TableHead className="h-auto py-3 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Status</TableHead>
          <TableHead className="h-auto py-3 text-right text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Amount</TableHead>
          <TableHead className="h-auto py-3 pr-5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((expense) => {
          const categoryName = expense.categoryId ? categoryById.get(expense.categoryId) : undefined
          return <TableRow key={expense.id} className="border-b-[oklch(0.95_0.006_60)]">
            <TableCell className="py-4 pl-5 text-[13px] whitespace-nowrap text-muted-foreground">{expense.expenseDate}</TableCell>
            <TableCell className="py-4">
              <div className="text-sm font-semibold">{expense.description}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Paid by {expense.payers.map((payer) => names.get(payer.userId) ?? payer.user?.name ?? payer.userId.slice(0, 8)).join(", ")}</div>
            </TableCell>
            <TableCell className="py-4">{categoryName ? <span className={cn("inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-bold", categoryColorFor(categoryName))}>{categoryName}</span> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
            <TableCell className="py-4 text-[13px] text-muted-foreground">{SPLIT_LABEL[expense.splitType]}</TableCell>
            <TableCell className="py-4"><Badge variant={STATUS_VARIANT[expense.status]}>{expense.status}</Badge></TableCell>
            <TableCell className="py-4 text-right text-sm font-bold tabular-nums">
              {formatMoney(expense.amount, expense.currency)}
              {(() => { const base = baseAmountLine(expense, trip, rates.data ?? []); return base ? <div className="mt-0.5 text-xs font-normal text-muted-foreground">≈ {base}</div> : null })()}
            </TableCell>
            <TableCell className="py-4 pr-5"><div className="flex justify-end gap-2">{expense.canEdit ? <Button size="sm" variant="outline" className="h-auto rounded-[7px] px-2.5 py-1 text-xs font-semibold" disabled={pendingAction} onClick={() => onEdit(expense)}>Edit</Button> : null}{expense.canApprove ? <Button size="sm" className="h-auto rounded-[7px] px-2.5 py-1 text-xs font-semibold" disabled={pendingAction} onClick={() => onApprove(expense)}>{pendingAction ? <Spinner /> : "Approve"}</Button> : null}{expense.canReject ? <Button size="sm" variant="outline" className="h-auto rounded-[7px] px-2.5 py-1 text-xs font-semibold" disabled={pendingAction} onClick={() => onReject(expense)}>Reject</Button> : null}{expense.canDelete ? <Button size="sm" variant="ghost" className="h-auto px-2 py-1 text-xs font-semibold text-destructive hover:text-destructive" disabled={pendingAction} onClick={() => onDelete(expense)}>{pendingAction ? <Spinner /> : "Delete"}</Button> : null}</div></TableCell>
          </TableRow>
        })}
      </TableBody>
    </Table>
  </div>
}
