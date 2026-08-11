"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { categoryColorFor } from "@/lib/category-colors"
import { cn } from "@/lib/utils"
import type { Expense, ExpenseCategory } from "@/features/expense/types"

const SPLIT_LABEL: Record<Expense["splitType"], string> = {
  equal: "Equal", manual: "Exact", item: "Itemized", percent: "Percent", shares: "Shares",
}

const STATUS_VARIANT: Record<Expense["status"], "outline" | "secondary" | "destructive"> = {
  pending: "secondary", approved: "outline", rejected: "destructive",
}

export function ExpenseTable({ expenses, categories, pendingAction, hasAnyExpenses = true, onEdit, onDelete, onApprove, onReject }: { expenses: Expense[]; categories: ExpenseCategory[]; pendingAction: boolean; hasAnyExpenses?: boolean; onEdit: (expense: Expense) => void; onDelete: (expense: Expense) => void; onApprove: (expense: Expense) => void; onReject: (expense: Expense) => void }) {
  if (!expenses.length) return <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">{hasAnyExpenses ? "No expenses match these filters." : "No expenses yet. Add your first bill to get started."}</div>
  const categoryById = new Map(categories.map((category) => [category.id, category.name]))
  return <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead>Split</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
    {expenses.map((expense) => {
      const categoryName = expense.categoryId ? categoryById.get(expense.categoryId) : undefined
      return <TableRow key={expense.id}>
        <TableCell className="whitespace-nowrap">{expense.expenseDate}</TableCell>
        <TableCell>
          <div className="font-medium">{expense.description}</div>
          <div className="text-xs text-muted-foreground">{expense.payers.map((payer) => payer.user?.name ?? payer.userId.slice(0, 8)).join(", ")}</div>
        </TableCell>
        <TableCell>{categoryName ? <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", categoryColorFor(categoryName))}>{categoryName}</span> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{SPLIT_LABEL[expense.splitType]}</TableCell>
        <TableCell><Badge variant={STATUS_VARIANT[expense.status]}>{expense.status}</Badge></TableCell>
        <TableCell className="text-right font-medium tabular-nums">{expense.currency} {expense.amount}</TableCell>
        <TableCell><div className="flex gap-1">{expense.canEdit ? <Button size="sm" variant="outline" disabled={pendingAction} onClick={() => onEdit(expense)}>Edit</Button> : null}{expense.canApprove ? <Button size="sm" disabled={pendingAction} onClick={() => onApprove(expense)}>{pendingAction ? <Spinner /> : "Approve"}</Button> : null}{expense.canReject ? <Button size="sm" variant="outline" disabled={pendingAction} onClick={() => onReject(expense)}>Reject</Button> : null}{expense.canDelete ? <Button size="sm" variant="destructive" disabled={pendingAction} onClick={() => onDelete(expense)}>{pendingAction ? <Spinner /> : "Delete"}</Button> : null}</div></TableCell>
      </TableRow>
    })}
  </TableBody></Table>
}
