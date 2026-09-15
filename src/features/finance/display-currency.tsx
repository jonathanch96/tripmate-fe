"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { convertFromBase, otherTripCurrencies } from "@/features/finance/rate-pair-helpers"
import type { Rate } from "@/features/finance/types"
import { apiFetch } from "@/lib/api-client"
import { formatMoney } from "@/lib/money"
import { qk } from "@/lib/query-keys"

/** Anything `formatMoney` can render — a raw API string, a number, or a computed Decimal. */
export type MoneyAmount = Parameters<typeof formatMoney>[0]
export type MoneyFormat = (amount: MoneyAmount) => string

export type TripDisplayCurrency = {
  /** The trip's base currency — what every amount handed to `primary`/`secondary` is already in. */
  base: string
  /** The currency the headline number is rendered in. Equal to `base` only when the trip has no
   * other currency, or the reader picked "base only". */
  code: string
  options: string[]
  hasChoices: boolean
  isLoading: boolean
  rates: Rate[]
  select: (code: string) => void
  /** Formats a base-currency amount as the headline figure, in `code`. */
  primary: MoneyFormat
  /** The "≈ IDR 1,000" line that belongs under that figure, or null when `code` is the base. */
  secondary: (amount: MoneyAmount) => string | null
}

// Money on a trip is entered and settled in the base currency, but people read the page in the
// currency they are actually spending — so the trip's first non-base currency leads, and the base
// amount becomes the approximation underneath. Picking the base from the dropdown turns the
// second line off entirely.
export function useDisplayCurrency(tripCode: string, baseCurrency: string): TripDisplayCurrency {
  const [picked, setPicked] = useState<string | null>(null)
  const rates = useQuery({
    queryKey: qk.rates(tripCode),
    queryFn: async () => (await apiFetch<Rate[]>(`/api/trips/${tripCode}/exchange-rates`)).data ?? [],
  })
  const rateRows = rates.data ?? []
  const others = otherTripCurrencies(baseCurrency, rateRows).map((row) => row.code)
  // `picked` is only honoured while it is still one of the trip's currencies: a currency removed
  // in settings must not strand the page on a code it can no longer convert to.
  const valid = picked && (picked === baseCurrency || others.includes(picked))
  const code = valid ? picked! : (others[0] ?? baseCurrency)

  const converted = (amount: MoneyAmount) =>
    code === baseCurrency ? null : convertFromBase(amount, baseCurrency, code, rateRows)

  return {
    base: baseCurrency,
    code,
    options: [...others, baseCurrency],
    hasChoices: others.length > 0,
    isLoading: rates.isLoading,
    rates: rateRows,
    select: setPicked,
    primary: (amount) => {
      const value = converted(amount)
      return value ? formatMoney(value, code) : formatMoney(amount, baseCurrency)
    },
    secondary: (amount) => (converted(amount) ? `≈ ${formatMoney(amount, baseCurrency)}` : null),
  }
}

export function DisplayCurrencySelect({ display, className }: { display: TripDisplayCurrency; className?: string }) {
  if (!display.hasChoices) return null
  return (
    <NativeSelect
      aria-label="Display currency"
      value={display.code}
      onChange={(event) => display.select(event.target.value)}
      className={className}
    >
      {display.options.map((code) => (
        <NativeSelectOption key={code} value={code}>
          {code === display.base ? `Show in ${code} only` : `Show in ${code}`}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}
