"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Decimal from "decimal.js"
import Link from "next/link"
import { Plus } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExpenseDialog } from "@/features/expense/components/expense-dialog"
import { submitExpense } from "@/features/expense/submit-expense"
import type { Expense, ExpensePayload } from "@/features/expense/types"
import { MissingRateState } from "@/features/finance/missing-rate-state"
import type { BalanceResult } from "@/features/finance/types"
import { useTrip } from "@/features/trip/trip-context"
import { apiFetch } from "@/lib/api-client"
import { avatarColorFor, initialsOf } from "@/lib/avatar-colors"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

const money = (amount: string, currency: string) => `${currency} ${amount}`

// Mirrors the backend's money.DisplayScale — these currencies have no minor unit.
const zeroScaleCurrencies = new Set(["IDR", "JPY", "KRW", "VND"])
const displayScale = (currency: string) => (zeroScaleCurrencies.has(currency.toUpperCase()) ? 0 : 2)

function BalanceBar({ fraction, positive }: { fraction: number; positive: boolean }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", positive ? "bg-success" : "bg-destructive")}
        style={{ width: `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%` }}
      />
    </div>
  )
}

export function Dashboard() {
  const { trip, participants } = useTrip()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: qk.balances(trip.code), queryFn: async () => (await apiFetch<BalanceResult>(`/api/trips/${trip.code}/balances`)).data! })
  const expenses = useQuery({ queryKey: [...qk.expenses(trip.code), "dashboard-recent"], queryFn: async () => (await apiFetch<Expense[]>(`/api/trips/${trip.code}/expenses?per_page=4`)).data ?? [] })
  const refresh = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.expenses(trip.code) }),
    queryClient.invalidateQueries({ queryKey: qk.balances(trip.code) }),
    queryClient.invalidateQueries({ queryKey: qk.finalSettlement(trip.code) }),
  ])
  const create = useMutation({
    mutationFn: (payload: ExpensePayload) => submitExpense(trip.code, payload),
    onSuccess: async () => { toast.success("Expense added"); await refresh() },
    onError: () => toast.error("Could not add expense"),
  })
  if (query.isLoading) return <p className="text-muted-foreground">Calculating balances…</p>
  if (query.error) return <MissingRateState error={query.error} tripCode={trip.code} />
  const result = query.data
  if (!result) return null
  const users = new Map(result.balances.map((row) => [row.userId, row.user.name]))
  const pending = result.summary.pendingExpenseCount + result.summary.pendingSettlementCount
  const maxBalance = Math.max(1, ...result.balances.map((row) => Math.abs(new Decimal(row.netBalance).toNumber())))
  const currentBalance = result.balances.find((row) => row.user.email === session?.user?.email)
  const mine = new Decimal(currentBalance?.netBalance ?? 0)
  const recent = [...(expenses.data ?? [])].sort((a, b) => b.expenseDate.localeCompare(a.expenseDate)).slice(0, 4)
  const summaryCards = [
    {
      label: "Your balance",
      value: mine.isZero() ? "Settled up" : `${mine.isPositive() ? "+" : "−"}${money(mine.abs().toFixed(displayScale(result.baseCurrency)), result.baseCurrency)}`,
      valueClassName: mine.isPositive() ? "text-success" : mine.isNegative() ? "text-destructive" : "",
    },
    { label: "Total trip spend", value: money(result.summary.totalExpenses, result.baseCurrency), valueClassName: "" },
    { label: "Members", value: String(participants.length), valueClassName: "" },
  ]
  return <section className="space-y-8">
    <div className="flex items-end justify-between gap-4"><div><h1 className="font-heading text-[26px] font-extrabold">Overview</h1><p className="mt-1.5 text-sm text-muted-foreground">How things stand right now.</p></div><ExpenseDialog trip={trip} participants={participants} pending={create.isPending} onSubmit={(payload) => create.mutate(payload)} onReceiptConverted={refresh} /></div>
    {trip.canEditSettings && pending > 0 ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"><strong>{pending} approval{pending === 1 ? "" : "s"} waiting.</strong> Resolve them before finalizing.</div> : null}
    <div className="grid gap-4 sm:grid-cols-3">{summaryCards.map(({ label, value, valueClassName }) => <Card key={label} className="rounded-[14px] py-5"><CardHeader className="px-5"><CardTitle className="text-xs font-bold tracking-[0.04em] text-muted-foreground uppercase">{label}</CardTitle></CardHeader><CardContent className={cn("px-5 font-heading text-[22px] font-extrabold", valueClassName)}>{value}</CardContent></Card>)}</div>
    {result.summary.expenseCount === 0 ? <div className="rounded-2xl border border-dashed px-6 py-11 text-center"><p className="font-bold">No activity yet</p><p className="mt-1 text-sm text-muted-foreground">Add your first expense to see it show up here.</p><Link className={cn(buttonVariants(), "mt-5")} href={`/trip/${trip.code}/expenses`}><Plus />Add expense</Link></div> : <>
      <div><h2 className="mb-3.5 font-heading text-[15px] font-extrabold">Balances</h2><Card className="rounded-[14px] py-2"><CardContent className="px-5">{result.balances.map((row) => { const value = new Decimal(row.netBalance), getsBack = value.isPositive(); const name = row.user.name || row.user.email; return <div key={row.userId} className="flex items-center gap-3.5 border-b py-3 last:border-0"><Avatar size="sm"><AvatarFallback className={avatarColorFor(name)}>{initialsOf(name)}</AvatarFallback></Avatar><span className="w-[130px] shrink-0 truncate text-sm font-semibold">{name}</span><div className="flex-1"><BalanceBar fraction={Math.abs(value.toNumber()) / maxBalance} positive={getsBack} /></div><span className={cn("w-[170px] text-right text-[13px] font-bold", value.isZero() ? "text-muted-foreground" : getsBack ? "text-success" : "text-destructive")}>{value.isZero() ? "settled up" : getsBack ? "gets back " : "owes "}{value.isZero() ? "" : money(value.abs().toFixed(displayScale(result.baseCurrency)), result.baseCurrency)}</span></div> })}</CardContent></Card></div>
      <div><div className="mb-3.5 flex items-baseline justify-between"><h2 className="font-heading text-[15px] font-extrabold">Recent activity</h2><Link className="text-[13px] font-semibold text-primary" href={`/trip/${trip.code}/expenses`}>View all expenses →</Link></div><Card className="rounded-[14px] py-2"><CardContent className="px-5">{recent.map((expense) => <div key={expense.id} className="flex items-center justify-between border-b py-3 last:border-0"><div><p className="text-sm font-semibold">{expense.description}</p><p className="mt-0.5 text-xs text-muted-foreground">{expense.expenseDate}</p></div><span className="text-sm font-bold tabular-nums">{money(expense.amount, expense.currency)}</span></div>)}</CardContent></Card></div>
      {result.debts.length ? <div className="sr-only">{result.debts.map((debt, index) => <span key={`${debt.fromUserId}-${index}`}>{users.get(debt.fromUserId)} owes {users.get(debt.toUserId)} {debt.amount}</span>)}</div> : null}
    </>}
  </section>
}
