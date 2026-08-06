"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Expense } from "@/features/expense/types"

export function ExpenseTable({ expenses, planner, pendingAction, onDelete, onApprove, onReject }: { expenses: Expense[]; planner: boolean; pendingAction: boolean; onDelete: (expense: Expense) => void; onApprove: (expense: Expense) => void; onReject: (expense: Expense) => void }) {
  if (!expenses.length) return <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">No expenses match these filters.</div>
  return <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Payers</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
    {expenses.map((expense) => <TableRow key={expense.id}><TableCell>{expense.expenseDate}</TableCell><TableCell>{expense.description}</TableCell><TableCell>{expense.payers.map((payer) => payer.user?.name ?? payer.userId.slice(0, 8)).join(", ")}</TableCell><TableCell><Badge variant="outline">{expense.status}</Badge></TableCell><TableCell className="text-right font-medium">{expense.currency} {expense.amount}</TableCell><TableCell><div className="flex gap-1">{planner && expense.status === "pending" ? <><Button size="sm" disabled={pendingAction} onClick={() => onApprove(expense)}>Approve</Button><Button size="sm" variant="outline" disabled={pendingAction} onClick={() => onReject(expense)}>Reject</Button></> : null}{expense.canDelete ? <Button size="sm" variant="destructive" disabled={pendingAction} onClick={() => onDelete(expense)}>Delete</Button> : null}</div></TableCell></TableRow>)}
  </TableBody></Table>
}
