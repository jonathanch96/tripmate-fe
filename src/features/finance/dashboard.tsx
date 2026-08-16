"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Decimal from "decimal.js"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { LoadingState } from "@/components/ui/spinner"
import { ExpenseDialog } from "@/features/expense/components/expense-dialog"
import { listExpenseCategories } from "@/features/expense/category-api"
import { submitExpense } from "@/features/expense/submit-expense"
import type { Expense, ExpensePayload } from "@/features/expense/types"
import { MissingRateState } from "@/features/finance/missing-rate-state"
import { convertFromBase, otherTripCurrencies } from "@/features/finance/rate-pair-helpers"
import type { BalanceResult, Rate } from "@/features/finance/types"
import { useTrip } from "@/features/trip/trip-context"
import { apiFetch } from "@/lib/api-client"
import { categoryColorFor } from "@/lib/category-colors"
import { apiErrorMessage } from "@/lib/envelope"
import { formatMoney } from "@/lib/money"
import { participantNameMap } from "@/lib/participant-name"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

function BalanceBar({ fraction, owed }: { fraction: number; owed: boolean }) {
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
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
  const queryClient = useQueryClient()
  const [secondaryCurrency, setSecondaryCurrency] = useState("")

  const query = useQuery({ queryKey: qk.balances(trip.code), queryFn: async () => (await apiFetch<BalanceResult>(`/api/trips/${trip.code}/balances`)).data! })
  const activity = useQuery({
    queryKey: [...qk.expenses(trip.code), "recent"],
    queryFn: async () => (await apiFetch<Expense[]>(`/api/trips/${trip.code}/expenses?sort=created_desc&per_page=4`)).data ?? [],
  })
  const categories = useQuery({ queryKey: qk.expenseCategories(trip.code), queryFn: async () => (await listExpenseCategories(trip.code)).data ?? [] })
  const rates = useQuery({ queryKey: qk.rates(trip.code), queryFn: async () => (await apiFetch<Rate[]>(`/api/trips/${trip.code}/exchange-rates`)).data ?? [] })

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.balances(trip.code) }),
      queryClient.invalidateQueries({ queryKey: qk.expenses(trip.code) }),
      queryClient.invalidateQueries({ queryKey: qk.finalSettlement(trip.code) }),
    ])
  }
  const create = useMutation({
    mutationFn: (payload: ExpensePayload) => submitExpense(trip.code, payload),
    onSuccess: async () => { toast.success("Expense added"); await refresh() },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not add expense")),
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

  const secondaryOptions = rates.data ? otherTripCurrencies(trip.baseCurrency, rates.data) : []
  const showSecondary = secondaryCurrency.length > 0
  const secondaryLabel = (amount: Decimal.Value) => {
    if (!showSecondary || !rates.data) return null
    const converted = convertFromBase(amount, trip.baseCurrency, secondaryCurrency, rates.data)
    return converted ? `≈ ${formatMoney(converted.abs(), secondaryCurrency)}` : null
  }
  const categoryName = (id: string | null) => categories.data?.find((category) => category.id === id)?.name ?? "Other"
  const names = participantNameMap(participants)
  const nameFor = (userId: string, fallback?: string | null) => names.get(userId) ?? fallback ?? "Participant"

  return (
    <section>
      <div className="mb-[26px] flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-extrabold">Overview</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">How things stand right now.</p>
        </div>
        <div className="flex items-center gap-2.5">
          {secondaryOptions.length > 0 ? (
            <NativeSelect
              aria-label="Show a secondary currency"
              value={secondaryCurrency}
              onChange={(event) => setSecondaryCurrency(event.target.value)}
              className="text-[13px]"
            >
              <NativeSelectOption value="">Show in {trip.baseCurrency} only</NativeSelectOption>
              {secondaryOptions.map((option) => (
                <NativeSelectOption key={option.code} value={option.code}>Also show in {option.code}</NativeSelectOption>
              ))}
            </NativeSelect>
          ) : null}
          <ExpenseDialog trip={trip} participants={participants} pending={create.isPending} onSubmit={(payload) => create.mutate(payload)} onReceiptConverted={refresh} />
        </div>
      </div>

      {trip.canEditSettings && pending > 0 ? (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <strong>{pending} approval{pending === 1 ? "" : "s"} waiting.</strong> Resolve them before finalizing.
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[14px] border border-border bg-white p-5">
          <p className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Your balance</p>
          <p className={cn("font-heading text-[22px] font-extrabold", mineValue == null ? "" : mineOwed ? "text-success" : "text-destructive")}>
            {mineValue == null ? "—" : mineValue.abs().lessThan("0.5") ? "Settled up" : `${mineOwed ? "+" : "-"}${formatMoney(mineValue.abs(), result.baseCurrency)}`}
          </p>
          {mineValue != null && mineValue.abs().greaterThanOrEqualTo("0.5") ? (
            <p className="mt-1 text-xs text-muted-foreground">{secondaryLabel(mineValue.abs())}</p>
          ) : null}
        </div>
        <div className="rounded-[14px] border border-border bg-white p-5">
          <p className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Total trip spend</p>
          <p className="font-heading text-[22px] font-extrabold">{formatMoney(result.summary.totalExpenses, result.baseCurrency)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{secondaryLabel(result.summary.totalExpenses)}</p>
        </div>
        <div className="rounded-[14px] border border-border bg-white p-5">
          <p className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Members</p>
          <p className="font-heading text-[22px] font-extrabold">{participants.length}</p>
        </div>
      </div>

      <h3 className="mb-1 font-heading text-[15px] font-extrabold">Who owes who</h3>
      <p className="mb-3.5 text-[13px] text-muted-foreground">Fewest possible payments to settle everyone up.</p>
      <div className="mb-8 rounded-[14px] border border-border bg-white px-5">
        {result.balances.map((row) => {
          const value = new Decimal(row.netBalance), owed = !value.isNegative()
          const settled = value.abs().lessThan("0.5")
          return (
            <div key={row.userId} className="flex items-center gap-3.5 border-b border-[oklch(0.95_0.006_60)] py-3.5 last:border-0">
              <span className="w-[130px] shrink-0 truncate text-sm font-semibold">{nameFor(row.userId, row.user.name || row.user.email)}</span>
              <BalanceBar fraction={Math.abs(value.toNumber()) / maxBalance} owed={owed} />
              <div className="w-[170px] shrink-0 text-right">
                <span className={cn("text-[13px] font-bold", settled ? "text-muted-foreground" : owed ? "text-success" : "text-destructive")}>
                  {settled ? "settled up" : `${owed ? "is owed " : "owes "}${formatMoney(value.abs(), result.baseCurrency)}`}
                </span>
                {!settled ? <p className="mt-0.5 text-[11px] text-muted-foreground">{secondaryLabel(value.abs())}</p> : null}
              </div>
            </div>
          )
        })}
        {result.debts.length ? (
          <div className="py-3.5">
            <p className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Suggested transfers</p>
            <div className="space-y-2.5">
              {result.debts.map((debt, index) => (
                <div key={index} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{nameFor(debt.fromUserId)} → {nameFor(debt.toUserId)}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold tabular-nums">{formatMoney(debt.amount, debt.currency)}</span>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{secondaryLabel(debt.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-3.5 text-[13px] text-muted-foreground">Nothing to pay or collect.</p>
        )}
      </div>

      <div className="mb-3.5 flex items-baseline justify-between">
        <h3 className="font-heading text-[15px] font-extrabold">Recent activity</h3>
        <Link href={`/trip/${trip.code}/expenses`} className="text-[13px] font-semibold text-primary hover:underline">View all expenses →</Link>
      </div>
      {activity.isLoading ? <LoadingState label="Loading recent activity…" /> : activity.data?.length ? (
        <div className="rounded-[14px] border border-border bg-white px-5">
          {activity.data.map((expense) => {
            const secondary = expense.currency === trip.baseCurrency ? secondaryLabel(expense.amount) : null
            const payersLabel = expense.payers.map((payer) => nameFor(payer.userId, payer.user?.name).split(" ")[0]).filter(Boolean).join(" & ")
            return (
              <div key={expense.id} className="flex items-center justify-between gap-3 border-b border-[oklch(0.95_0.006_60)] py-3.5 last:border-0">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={cn("shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-bold", categoryColorFor(categoryName(expense.categoryId)))}>
                    {categoryName(expense.categoryId)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{expense.description}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {expense.expenseDate}{payersLabel ? ` · paid by ${payersLabel}` : ""}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums">{formatMoney(expense.amount, expense.currency)}</p>
                  {secondary ? <p className="text-[11px] text-muted-foreground">{secondary}</p> : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border-[1.5px] border-dashed border-border px-6 py-11 text-center">
          <p className="mb-1.5 text-[15px] font-bold">No activity yet</p>
          <p className="mb-4.5 text-[13px] text-muted-foreground">Add your first expense to see it show up here.</p>
          <ExpenseDialog trip={trip} participants={participants} pending={create.isPending} onSubmit={(payload) => create.mutate(payload)} onReceiptConverted={refresh} />
        </div>
      )}
    </section>
  )
}
