"use client"

import { useQuery } from "@tanstack/react-query"
import Decimal from "decimal.js"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MissingRateState } from "@/features/finance/missing-rate-state"
import type { BalanceResult } from "@/features/finance/types"
import { useTrip } from "@/features/trip/trip-context"
import { apiFetch } from "@/lib/api-client"
import { qk } from "@/lib/query-keys"

const money = (amount: string, currency: string) => `${currency} ${amount}`

// Mirrors the backend's money.DisplayScale — these currencies have no minor unit.
const zeroScaleCurrencies = new Set(["IDR", "JPY", "KRW", "VND"])
const displayScale = (currency: string) => (zeroScaleCurrencies.has(currency.toUpperCase()) ? 0 : 2)

export function Dashboard() {
  const { trip, participants } = useTrip()
  const query = useQuery({ queryKey: qk.balances(trip.code), queryFn: async () => (await apiFetch<BalanceResult>(`/api/trips/${trip.code}/balances`)).data! })
  if (query.isLoading) return <p>Calculating balances…</p>
  if (query.error) return <MissingRateState error={query.error} tripCode={trip.code} />
  const result = query.data
  if (!result) return null
  const users = new Map(result.balances.map((row) => [row.userId, row.user.name]))
  const pending = result.summary.pendingExpenseCount + result.summary.pendingSettlementCount
  return <section className="space-y-6">
    <div><h2 className="text-xl font-semibold">Trip dashboard</h2><p className="text-sm text-muted-foreground">One view of every expense, settlement, and remaining debt.</p></div>
    {trip.canEditSettings && pending > 0 ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><strong>{pending} approval{pending === 1 ? "" : "s"} waiting.</strong> Resolve them before finalizing.</div> : null}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
      ["Total expenses", money(result.summary.totalExpenses, result.baseCurrency)], ["Amount settled", money(result.summary.totalSettled, result.baseCurrency)], ["Participants", String(participants.length)], ["Base currency", result.baseCurrency],
    ].map(([label, value]) => <Card key={label}><CardHeader><CardTitle>{label}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{value}</CardContent></Card>)}</div>
    {result.summary.expenseCount === 0 ? <Card><CardContent className="py-10 text-center"><p className="font-medium">No expenses yet</p><p className="mt-1 text-muted-foreground">Add the first expense to see who owes whom.</p><Link className="mt-3 inline-block underline" href={`/trip/${trip.code}/expenses`}>Add an expense</Link></CardContent></Card> : <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Participant balances</CardTitle></CardHeader><CardContent className="space-y-3">{result.balances.map((row) => { const value = new Decimal(row.netBalance), owed = !value.isNegative(); return <div key={row.userId} className="flex justify-between border-b pb-2 last:border-0"><span>{row.user.name || row.user.email}</span><span className={owed ? "text-emerald-700" : "text-rose-700"}>{owed ? "is owed " : "owes "}{money(value.abs().toFixed(displayScale(result.baseCurrency)), result.baseCurrency)}</span></div> })}</CardContent></Card>
      <Card><CardHeader><CardTitle>Who owes whom</CardTitle></CardHeader><CardContent className="space-y-3">{result.debts.length === 0 ? <p className="text-muted-foreground">Everyone is settled up.</p> : result.debts.map((debt, index) => <div key={`${debt.fromUserId}-${debt.toUserId}-${index}`} className="flex items-center justify-between"><span>{users.get(debt.fromUserId) ?? "Participant"} → {users.get(debt.toUserId) ?? "Participant"}</span><strong>{money(debt.amount, debt.currency)}</strong></div>)}</CardContent></Card>
    </div>}
  </section>
}
