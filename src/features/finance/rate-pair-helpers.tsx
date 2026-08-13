import Decimal from "decimal.js"

import type { Rate } from "@/features/finance/types"

export type RateDraft = { from: string; to: string; rate: string }

export const parsePair = (pair: string, fallbackTo: string): RateDraft => {
  const [from = "", to = ""] = pair.split("→")
  return { from: from.toUpperCase(), to: (to || fallbackTo).toUpperCase(), rate: "" }
}

export const normalizeCode = (code: string) => code.trim().toUpperCase()

// A currency pair is stored in one direction only — the backend retires the opposite row when a
// rate is saved. This finds the row that a draft is about to replace, so the planner is told first.
// Shared by the Final plan page's rate-setting form and TripCurrenciesManager's add-currency form.
export function opposingRate(rates: Rate[] | undefined, draft: Pick<RateDraft, "from" | "to">) {
  const from = normalizeCode(draft.from), to = normalizeCode(draft.to)
  if (!from || !to || from === to) return undefined
  return rates?.find((rate) => normalizeCode(rate.from) === to && normalizeCode(rate.to) === from)
}

// The trip's non-base currencies, one entry per currency that has a rate stored directly against
// base (same "no separate currency-list table" model TripCurrenciesManager uses). Powers the
// Overview page's "also show in <currency>" toggle.
export function otherTripCurrencies(baseCurrency: string, rates: Rate[]): { code: string; rate: Rate }[] {
  const base = normalizeCode(baseCurrency)
  const seen = new Set([base])
  const rows: { code: string; rate: Rate }[] = []
  for (const rate of rates) {
    const from = normalizeCode(rate.from), to = normalizeCode(rate.to)
    const other = from === base ? to : to === base ? from : null
    if (!other || seen.has(other)) continue
    seen.add(other)
    rows.push({ code: other, rate })
  }
  return rows
}

// Converts an amount already in the trip's base currency into `targetCode`, using whichever
// directly-stored rate row covers that pair. Returns null when the trip has no such rate yet.
export function convertFromBase(amount: Decimal.Value, baseCurrency: string, targetCode: string, rates: Rate[]): Decimal | null {
  const row = otherTripCurrencies(baseCurrency, rates).find((entry) => entry.code === normalizeCode(targetCode))
  if (!row) return null
  const value = new Decimal(amount)
  const rateValue = new Decimal(row.rate.rate)
  // A stored row reads as "1 unit of `from` = `rate` units of `to`".
  return normalizeCode(row.rate.from) === normalizeCode(baseCurrency) ? value.mul(rateValue) : value.div(rateValue)
}

// The inverse of convertFromBase: converts an amount in `sourceCode` into the trip's base
// currency. Used to preview "what does this actually-charged amount come out to" while entering
// an expense, without changing which amount is used for splitting.
export function convertToBase(amount: Decimal.Value, baseCurrency: string, sourceCode: string, rates: Rate[]): Decimal | null {
  const row = otherTripCurrencies(baseCurrency, rates).find((entry) => entry.code === normalizeCode(sourceCode))
  if (!row) return null
  const value = new Decimal(amount)
  const rateValue = new Decimal(row.rate.rate)
  return normalizeCode(row.rate.from) === normalizeCode(baseCurrency) ? value.div(rateValue) : value.mul(rateValue)
}
