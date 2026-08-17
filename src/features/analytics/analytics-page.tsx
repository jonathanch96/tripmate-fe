"use client"

import { useState } from "react"
import { useQueries, useQuery } from "@tanstack/react-query"
import Link from "next/link"
import Decimal from "decimal.js"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { LoadingState } from "@/components/ui/spinner"
import { BreakdownBar } from "@/features/analytics/breakdown-bar"
import { listExpenseCategories } from "@/features/expense/category-api"
import { listAllExpenses } from "@/features/expense/api"
import { convertFromBase, convertToBase } from "@/features/finance/rate-pair-helpers"
import type { Rate } from "@/features/finance/types"
import type { Trip } from "@/features/trip/types"
import { apiFetch } from "@/lib/api-client"
import { formatMoney } from "@/lib/money"
import { qk } from "@/lib/query-keys"

function toRows(totals: Map<string, Decimal>): { rows: { key: string; amount: Decimal }[]; total: Decimal } {
  const total = [...totals.values()].reduce((sum, amount) => sum.add(amount), new Decimal(0))
  const rows = [...totals.entries()].map(([key, amount]) => ({ key, amount })).sort((a, b) => b.amount.comparedTo(a.amount))
  return { rows, total }
}

// Whichever base currency the most trips share needs the fewest missing exchange rates to show
// real numbers by default, so it beats a fixed currency like USD that most trips may never trade against.
function mostCommonCurrency(currencies: string[]): string {
  const counts = new Map<string, number>()
  for (const code of currencies) counts.set(code, (counts.get(code) ?? 0) + 1)
  let best = "USD"
  let bestCount = 0
  for (const [code, count] of counts) {
    if (count > bestCount) { best = code; bestCount = count }
  }
  return best
}

export function AnalyticsPage() {
  const trips = useQuery({ queryKey: qk.trips(), queryFn: async () => (await apiFetch<Trip[]>("/api/trips")).data ?? [] })
  const tripList = trips.data ?? []
  const [selectedCurrency, setSelectedCurrency] = useState("")
  const currencyOptions = [...new Set(tripList.map((trip) => trip.baseCurrency.toUpperCase()))].sort()
  const targetCurrency = selectedCurrency || mostCommonCurrency(tripList.map((trip) => trip.baseCurrency))

  const expenseQueries = useQueries({
    queries: tripList.map((trip) => ({ queryKey: qk.allExpenses(trip.code), queryFn: () => listAllExpenses(trip.code) })),
  })
  const categoryQueries = useQueries({
    queries: tripList.map((trip) => ({ queryKey: qk.expenseCategories(trip.code), queryFn: async () => (await listExpenseCategories(trip.code)).data ?? [] })),
  })
  const rateQueries = useQueries({
    queries: tripList.map((trip) => ({ queryKey: qk.rates(trip.code), queryFn: async () => (await apiFetch<Rate[]>(`/api/trips/${trip.code}/exchange-rates`)).data ?? [] })),
  })

  const loading = trips.isLoading
    || expenseQueries.some((query) => query.isLoading)
    || categoryQueries.some((query) => query.isLoading)
    || rateQueries.some((query) => query.isLoading)

  if (loading) return <LoadingState label="Crunching your trips…" className="justify-center" />

  const categoryTotals = new Map<string, Decimal>()
  const countryTotals = new Map<string, Decimal>()
  let grandTotal = new Decimal(0)
  let unconvertedTrips = 0

  tripList.forEach((trip, index) => {
    const expenses = (expenseQueries[index]?.data ?? []).filter((expense) => expense.status === "approved")
    const categories = categoryQueries[index]?.data ?? []
    const rateRows = rateQueries[index]?.data ?? []
    const isBaseTarget = trip.baseCurrency.toUpperCase() === targetCurrency

    let tripBaseTotal = new Decimal(0)
    const tripCategoryBase = new Map<string, Decimal>()
    for (const expense of expenses) {
      const baseAmount = expense.currency === trip.baseCurrency
        ? new Decimal(expense.amount)
        : convertToBase(expense.amount, trip.baseCurrency, expense.currency, rateRows)
      if (baseAmount === null) continue
      tripBaseTotal = tripBaseTotal.add(baseAmount)
      const name = categories.find((category) => category.id === expense.categoryId)?.name ?? "Uncategorized"
      tripCategoryBase.set(name, (tripCategoryBase.get(name) ?? new Decimal(0)).add(baseAmount))
    }

    const toTarget = (amount: Decimal) => isBaseTarget ? amount : convertFromBase(amount, trip.baseCurrency, targetCurrency, rateRows)
    const tripTarget = toTarget(tripBaseTotal)
    if (tripTarget === null) { unconvertedTrips++; return }

    grandTotal = grandTotal.add(tripTarget)
    const country = trip.country || "Unspecified"
    countryTotals.set(country, (countryTotals.get(country) ?? new Decimal(0)).add(tripTarget))

    for (const [name, baseAmount] of tripCategoryBase) {
      const targetAmount = toTarget(baseAmount)
      if (targetAmount === null) continue
      categoryTotals.set(name, (categoryTotals.get(name) ?? new Decimal(0)).add(targetAmount))
    }
  })

  const { rows: categoryRows, total: categoryTotal } = toRows(categoryTotals)
  const { rows: countryRows, total: countryTotal } = toRows(countryTotals)
  const countryCount = [...countryTotals.keys()].filter((name) => name !== "Unspecified").length

  return (
    <section>
      <Link href="/trips" className="mb-3.5 inline-block text-[13px] font-semibold text-muted-foreground hover:text-foreground">‹ My trips</Link>
      <div className="mb-6.5 flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="font-heading text-[28px] font-extrabold">Analytics</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Spend across all your trips, converted to {targetCurrency} for comparison.</p>
        </div>
        {currencyOptions.length > 1 ? (
          <NativeSelect aria-label="Compare trips in this currency" value={targetCurrency} onChange={(event) => setSelectedCurrency(event.target.value)} className="text-[13px]">
            {currencyOptions.map((code) => (
              <NativeSelectOption key={code} value={code}>Compare in {code}</NativeSelectOption>
            ))}
          </NativeSelect>
        ) : null}
      </div>

      {unconvertedTrips > 0 ? (
        <p className="mb-4.5 text-xs text-muted-foreground">
          {unconvertedTrips} trip{unconvertedTrips === 1 ? "" : "s"} couldn&apos;t be converted to {targetCurrency} (no exchange rate configured) and {unconvertedTrips === 1 ? "is" : "are"} excluded from these totals.
        </p>
      ) : null}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[14px] border border-border bg-white p-5">
          <p className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Total spend</p>
          <p className="font-heading text-[22px] font-extrabold">{formatMoney(grandTotal, targetCurrency)}</p>
        </div>
        <div className="rounded-[14px] border border-border bg-white p-5">
          <p className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Trips</p>
          <p className="font-heading text-[22px] font-extrabold">{tripList.length}</p>
        </div>
        <div className="rounded-[14px] border border-border bg-white p-5">
          <p className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Countries visited</p>
          <p className="font-heading text-[22px] font-extrabold">{countryCount}</p>
        </div>
      </div>

      <h3 className="mb-3.5 font-heading text-[15px] font-extrabold">Cost by category</h3>
      {categoryRows.length ? (
        <div className="mb-8 rounded-[14px] border border-border bg-white px-5">
          {categoryRows.map((row) => (
            <BreakdownBar
              key={row.key}
              label={row.key}
              amountLabel={formatMoney(row.amount, targetCurrency)}
              pctLabel={categoryTotal.isZero() ? "0%" : `${Math.round(row.amount.div(categoryTotal).mul(100).toNumber())}%`}
              fraction={categoryTotal.isZero() ? 0 : row.amount.div(categoryTotal).toNumber()}
            />
          ))}
        </div>
      ) : (
        <p className="mb-8 text-sm text-muted-foreground">No approved expenses yet.</p>
      )}

      <h3 className="mb-3.5 font-heading text-[15px] font-extrabold">Cost by country</h3>
      {countryRows.length ? (
        <div className="rounded-[14px] border border-border bg-white px-5">
          {countryRows.map((row) => (
            <BreakdownBar
              key={row.key}
              label={row.key}
              amountLabel={formatMoney(row.amount, targetCurrency)}
              pctLabel={countryTotal.isZero() ? "0%" : `${Math.round(row.amount.div(countryTotal).mul(100).toNumber())}%`}
              fraction={countryTotal.isZero() ? 0 : row.amount.div(countryTotal).toNumber()}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No approved expenses yet.</p>
      )}
    </section>
  )
}
