"use client"

import { useQuery } from "@tanstack/react-query"
import Decimal from "decimal.js"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/spinner"
import { MissingRateState } from "@/features/finance/missing-rate-state"
import type { BalanceResult } from "@/features/finance/types"
import type { Expense } from "@/features/expense/types"
import { useTrip } from "@/features/trip/trip-context"
import { apiFetch } from "@/lib/api-client"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

const money = (amount: string, currency: string) => `${currency} ${amount}`

// Mirrors the backend's money.DisplayScale — these currencies have no minor unit.
const zeroScaleCurrencies = new Set(["IDR", "JPY", "KRW", "VND"])
const displayScale = (currency: string) => (zeroScaleCurrencies.has(currency.toUpperCase()) ? 0 : 2)

function BalanceBar({ fraction, owed }: { fraction: number; owed: boolean }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", owed ? "bg-success" : "bg-destructive")}
        style={{ width: `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%` }}
      />
    </div>
  )
}

export function Dashboard() {
  const { trip, participants } = useTrip()
  const { data: session } = useSession()
  const query = useQuery({ queryKey: qk.balances(trip.code), queryFn: async () => (await apiFetch<BalanceResult>(`/api/trips/${trip.code}/balances`)).data! })
  const activity = useQuery({
    queryKey: [...qk.expenses(trip.code), "recent"],
    queryFn: async () => (await apiFetch<Expense[]>(`/api/trips/${trip.code}/expenses?sort=created_desc&per_page=4`)).data ?? [],
  })
  if (query.isLoading) return <LoadingState label="Calculating balances…" />
  if (query.error) return <MissingRateState error={query.error} tripCode={trip.code} />
  const result = query.data
  if (!result) return null
  const mine = result.balances.find((row) => row.userId === session?.user?.id)
  const mineValue = mine ? new Decimal(mine.netBalance) : null
  const mineOwed = mineValue ? !mineValue.isNegative() : null
  const pending = result.summary.pendingExpenseCount + result.summary.pendingSettlementCount
  const maxBalance = Math.max(1, ...result.balances.map((row) => Math.abs(new Decimal(row.netBalance).toNumber())))
  return <section className="space-y-6">
    <div className="flex items-end justify-between gap-4">
      <div><h2 className="font-heading text-xl font-semibold">Overview</h2><p className="text-sm text-muted-foreground">How things stand right now.</p></div>
    </div>
    {trip.canEditSettings && pending > 0 ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"><strong>{pending} approval{pending === 1 ? "" : "s"} waiting.</strong> Resolve them before finalizing.</div> : null}
    <div className="grid gap-3 sm:grid-cols-3">
      <Card>
        <CardHeader><CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Your balance</CardTitle></CardHeader>
        <CardContent className={cn("font-heading text-2xl font-semibold", mineValue == null ? "" : mineOwed ? "text-success" : "text-destructive")}>
          {mineValue == null ? "—" : mineValue.abs().lessThan("0.5") ? "Settled up" : `${mineOwed ? "+" : "-"}${money(mineValue.abs().toFixed(displayScale(result.baseCurrency)), result.baseCurrency)}`}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Total trip spend</CardTitle></CardHeader>
        <CardContent className="font-heading text-2xl font-semibold">{money(result.summary.totalExpenses, result.baseCurrency)}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Members</CardTitle></CardHeader>
        <CardContent className="font-heading text-2xl font-semibold">{participants.length}</CardContent>
      </Card>
    </div>

    <h3 className="font-heading text-base font-semibold">Balances</h3>
    <Card>
      <CardContent className="space-y-4 pt-6">
        {result.balances.map((row) => {
          const value = new Decimal(row.netBalance), owed = !value.isNegative()
          return <div key={row.userId} className="space-y-1.5">
            <div className="flex justify-between text-sm"><span>{row.user.name || row.user.email}</span><span className={cn("font-medium", owed ? "text-success" : "text-destructive")}>{value.abs().lessThan("0.5") ? "settled up" : `${owed ? "gets back " : "owes "}${money(value.abs().toFixed(displayScale(result.baseCurrency)), result.baseCurrency)}`}</span></div>
            <BalanceBar fraction={Math.abs(value.toNumber()) / maxBalance} owed={owed} />
          </div>
        })}
      </CardContent>
    </Card>

    <div className="flex items-baseline justify-between">
      <h3 className="font-heading text-base font-semibold">Recent activity</h3>
      <Link href={`/trip/${trip.code}/expenses`} className="text-sm font-medium text-primary hover:underline">View all expenses →</Link>
    </div>
    {activity.isLoading ? <LoadingState label="Loading recent activity…" /> : activity.data?.length ? (
      <Card>
        <CardContent className="space-y-3 pt-6">
          {activity.data.map((expense) => (
            <div key={expense.id} className="flex items-center justify-between border-b pb-3 text-sm last:border-0 last:pb-0">
              <div>
                <p className="font-medium">{expense.description}</p>
                <p className="text-xs text-muted-foreground">{expense.expenseDate}</p>
              </div>
              <span className="font-semibold tabular-nums">{money(expense.amount, expense.currency)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    ) : (
      <Card className="border-dashed"><CardContent className="py-10 text-center"><p className="font-medium">No activity yet</p><p className="mt-1 text-muted-foreground">Add your first expense to see it show up here.</p><Link className="mt-3 inline-block text-primary underline underline-offset-4" href={`/trip/${trip.code}/expenses`}>Add an expense</Link></CardContent></Card>
    )}
  </section>
}
