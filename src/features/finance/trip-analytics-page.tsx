"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Decimal from "decimal.js"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { LoadingState } from "@/components/ui/spinner"
import { BreakdownBar } from "@/features/analytics/breakdown-bar"
import { listExpenseCategories } from "@/features/expense/category-api"
import { listAllExpenses } from "@/features/expense/api"
import { convertFromBase, convertToBase, otherTripCurrencies } from "@/features/finance/rate-pair-helpers"
import type { Rate } from "@/features/finance/types"
import { useTrip } from "@/features/trip/trip-context"
import { apiFetch } from "@/lib/api-client"
import { avatarColorFor, initialsOf } from "@/lib/avatar-colors"
import { formatMoney } from "@/lib/money"
import { participantNameMap } from "@/lib/participant-name"
import { qk } from "@/lib/query-keys"

type Row = { key: string; label: string; amount: Decimal }

function toRows(totals: Map<string, Decimal>): { rows: Row[]; total: Decimal } {
  const total = [...totals.values()].reduce((sum, amount) => sum.add(amount), new Decimal(0))
  const rows = [...totals.entries()]
    .map(([key, amount]) => ({ key, label: key, amount }))
    .sort((a, b) => b.amount.comparedTo(a.amount))
  return { rows, total }
}

export function TripAnalyticsPage() {
  const { trip, participants } = useTrip()
  const [secondaryCurrency, setSecondaryCurrency] = useState("")

  const expenses = useQuery({ queryKey: qk.allExpenses(trip.code), queryFn: () => listAllExpenses(trip.code) })
  const categories = useQuery({ queryKey: qk.expenseCategories(trip.code), queryFn: async () => (await listExpenseCategories(trip.code)).data ?? [] })
  const rates = useQuery({ queryKey: qk.rates(trip.code), queryFn: async () => (await apiFetch<Rate[]>(`/api/trips/${trip.code}/exchange-rates`)).data ?? [] })

  if (expenses.isLoading || categories.isLoading || rates.isLoading) return <LoadingState label="Crunching this trip's numbers…" />

  const approved = (expenses.data ?? []).filter((expense) => expense.status === "approved")
  const rateRows = rates.data ?? []
  const names = participantNameMap(participants)

  const categoryTotals = new Map<string, Decimal>()
  const personTotals = new Map<string, Decimal>()
  let excluded = 0

  for (const expense of approved) {
    const baseAmount = expense.currency === trip.baseCurrency
      ? new Decimal(expense.amount)
      : convertToBase(expense.amount, trip.baseCurrency, expense.currency, rateRows)
    if (baseAmount === null) { excluded++; continue }

    const categoryName = categories.data?.find((category) => category.id === expense.categoryId)?.name ?? "Uncategorized"
    categoryTotals.set(categoryName, (categoryTotals.get(categoryName) ?? new Decimal(0)).add(baseAmount))

    if (expense.payers.length === 1) {
      const [payer] = expense.payers
      const share = personTotals.get(payer!.userId) ?? new Decimal(0)
      personTotals.set(payer!.userId, share.add(baseAmount))
    } else {
      // Split the base amount across co-payers by their share of the original charge, so a bill
      // two people split 60/40 attributes 60%/40% of the base-currency total, not an even split.
      const chargeTotal = expense.payers.reduce((sum, payer) => sum.add(payer.amount), new Decimal(0))
      for (const payer of expense.payers) {
        if (chargeTotal.isZero()) continue
        const portion = baseAmount.mul(new Decimal(payer.amount).div(chargeTotal))
        personTotals.set(payer.userId, (personTotals.get(payer.userId) ?? new Decimal(0)).add(portion))
      }
    }
  }

  const { rows: categoryRows, total: categoryTotal } = toRows(categoryTotals)
  const personRows = [...personTotals.entries()]
    .map(([userId, amount]) => ({ userId, name: names.get(userId) ?? "Participant", amount }))
    .sort((a, b) => b.amount.comparedTo(a.amount))
  const personTotal = personRows.reduce((sum, row) => sum.add(row.amount), new Decimal(0))

  const secondaryOptions = otherTripCurrencies(trip.baseCurrency, rateRows)
  const showSecondary = secondaryCurrency.length > 0
  const secondaryLabel = (amount: Decimal.Value) => {
    if (!showSecondary) return null
    const converted = convertFromBase(amount, trip.baseCurrency, secondaryCurrency, rateRows)
    return converted ? `≈ ${formatMoney(converted, secondaryCurrency)}` : null
  }

  return (
    <section>
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="font-heading text-[26px] font-extrabold">Analytics</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Where this trip&apos;s money went.</p>
        </div>
        {secondaryOptions.length > 0 ? (
          <NativeSelect aria-label="Show a secondary currency" value={secondaryCurrency} onChange={(event) => setSecondaryCurrency(event.target.value)} className="text-[13px]">
            <NativeSelectOption value="">Show in {trip.baseCurrency} only</NativeSelectOption>
            {secondaryOptions.map((option) => (
              <NativeSelectOption key={option.code} value={option.code}>Also show in {option.code}</NativeSelectOption>
            ))}
          </NativeSelect>
        ) : null}
      </div>

      {excluded > 0 ? (
        <p className="mb-4 text-xs text-muted-foreground">{excluded} expense{excluded === 1 ? "" : "s"} couldn&apos;t be converted to {trip.baseCurrency} (no exchange rate) and {excluded === 1 ? "is" : "are"} excluded below.</p>
      ) : null}

      <div className="mb-8 max-w-[280px] rounded-[14px] border border-border bg-white p-5">
        <p className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Total trip spend</p>
        <p className="font-heading text-[22px] font-extrabold">{formatMoney(categoryTotal, trip.baseCurrency)}</p>
        {showSecondary ? <p className="mt-1 text-xs text-muted-foreground">{secondaryLabel(categoryTotal)}</p> : null}
      </div>

      <h3 className="mb-3.5 font-heading text-[15px] font-extrabold">Cost by category</h3>
      {categoryRows.length ? (
        <div className="mb-8 rounded-[14px] border border-border bg-white px-5">
          {categoryRows.map((row) => (
            <BreakdownBar
              key={row.key}
              label={row.label}
              amountLabel={formatMoney(row.amount, trip.baseCurrency)}
              pctLabel={categoryTotal.isZero() ? "0%" : `${Math.round(row.amount.div(categoryTotal).mul(100).toNumber())}%`}
              fraction={categoryTotal.isZero() ? 0 : row.amount.div(categoryTotal).toNumber()}
            />
          ))}
        </div>
      ) : (
        <p className="mb-8 text-sm text-muted-foreground">No approved expenses yet.</p>
      )}

      <h3 className="mb-3.5 font-heading text-[15px] font-extrabold">Cost by person (who fronted the money)</h3>
      {personRows.length ? (
        <div className="rounded-[14px] border border-border bg-white px-5">
          {personRows.map((row) => (
            <div key={row.userId} className="flex flex-wrap items-center gap-3.5 border-b border-[oklch(0.95_0.006_60)] py-3.5 last:border-0">
              <Avatar size="sm">
                <AvatarFallback className={avatarColorFor(row.name)}>{initialsOf(row.name)}</AvatarFallback>
              </Avatar>
              <span className="w-30 shrink-0 truncate text-sm font-semibold">{row.name}</span>
              <div className="h-2 min-w-20 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-success transition-all"
                  style={{ width: `${personTotal.isZero() ? 0 : Math.max(3, Math.round(row.amount.div(personTotal).mul(100).toNumber()))}%` }}
                />
              </div>
              <span className="w-28 shrink-0 text-right text-[13px] font-bold tabular-nums">{formatMoney(row.amount, trip.baseCurrency)}</span>
              <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">{personTotal.isZero() ? "0%" : `${Math.round(row.amount.div(personTotal).mul(100).toNumber())}%`}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No approved expenses yet.</p>
      )}
    </section>
  )
}
