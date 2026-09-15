"use client"

import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import type { RateDraft } from "@/features/finance/rate-pair-helpers"
import { SUPPORTED_CURRENCIES } from "@/lib/currencies"
import { cn } from "@/lib/utils"

// The row currently being filled in. It lives with the caller rather than inside the component so
// that a rate typed but never "added" still counts when the form is submitted — forgetting to
// press Add currency is the obvious way to lose a rate, and losing it silently is worse than
// saving one the planner can remove again.
export type PendingRate = { code: string; direction: "direct" | "inverse"; rate: string }

export const EMPTY_PENDING_RATE: PendingRate = { code: "", direction: "direct", rate: "" }

// Mirrors the backend's positive-decimal rule for a rate, so a half-typed value is simply not a
// draft yet instead of becoming a PUT that fails.
const POSITIVE_DECIMAL = /^\d+(?:\.\d+)?$/
const isRate = (value: string) => POSITIVE_DECIMAL.test(value) && Number.parseFloat(value) > 0

// How a drafted rate reads back to the planner, in the same "1 unit of `from` = `rate` units of
// `to`" direction the backend stores it in.
export function draftRateLabel(draft: RateDraft) {
  return `1 ${draft.from} = ${draft.rate} ${draft.to}`
}

// Every currency the trip does not already cover — the base itself and each drafted pair are out.
export function availableCurrencies(baseCurrency: string, drafts: RateDraft[]): string[] {
  const taken = new Set([baseCurrency, ...drafts.flatMap((draft) => [draft.from, draft.to])])
  return SUPPORTED_CURRENCIES.filter((code) => !taken.has(code))
}

// The currency the pending row is actually on: whatever was picked, or the first one still free
// (which is what the select shows before anyone touches it).
export function resolvePendingCode(pending: PendingRate, baseCurrency: string, drafts: RateDraft[]): string {
  const available = availableCurrencies(baseCurrency, drafts)
  return available.some((code) => code === pending.code) ? pending.code : (available[0] ?? "")
}

// The pending row as a saveable rate, or null while it is still incomplete.
export function pendingRateDraft(pending: PendingRate, baseCurrency: string, drafts: RateDraft[]): RateDraft | null {
  const code = resolvePendingCode(pending, baseCurrency, drafts)
  const rate = pending.rate.trim()
  if (!code || !isRate(rate)) return null
  return pending.direction === "direct" ? { from: baseCurrency, to: code, rate } : { from: code, to: baseCurrency, rate }
}

// The add-a-currency form from the trip's settings page, but collecting rows for a trip that does
// not exist yet: the drafts are saved one PUT at a time right after the trip is created.
export function CurrencyRateDraftList({ baseCurrency, drafts, pending, onDrafts, onPending }: {
  baseCurrency: string
  drafts: RateDraft[]
  pending: PendingRate
  onDrafts: (drafts: RateDraft[]) => void
  onPending: (pending: PendingRate) => void
}) {
  const available = availableCurrencies(baseCurrency, drafts)
  const code = resolvePendingCode(pending, baseCurrency, drafts)
  const entered = pending.rate.trim()
  const ready = pendingRateDraft(pending, baseCurrency, drafts)

  function add() {
    if (!ready) return
    onDrafts([...drafts, ready])
    // The direction survives: someone entering "1 X = n IDR" for one currency almost always
    // reads the next one the same way round.
    onPending({ ...EMPTY_PENDING_RATE, direction: pending.direction })
  }

  return (
    <div className="space-y-2.5">
      {drafts.length ? (
        <div className="rounded-lg border">
          {drafts.map((draft, index) => {
            const other = draft.from === baseCurrency ? draft.to : draft.from
            return (
              <div key={`${draft.from}-${draft.to}`} className="flex items-center gap-3 border-b px-4 py-2.5 text-sm last:border-0">
                <span className="font-bold">{other}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">{draftRateLabel(draft)}</span>
                <button
                  type="button"
                  className="text-xs font-semibold text-destructive"
                  aria-label={`Remove ${other}`}
                  onClick={() => onDrafts(drafts.filter((_, position) => position !== index))}
                >
                  Remove
                </button>
              </div>
            )
          })}
        </div>
      ) : null}
      {available.length ? (
        <>
          <div className="grid grid-cols-2 gap-2.5 md:flex md:flex-wrap">
            <NativeSelect aria-label="Currency to add" value={code} onChange={(event) => onPending({ ...pending, code: event.target.value })}>
              {available.map((option) => <NativeSelectOption key={option} value={option}>{option}</NativeSelectOption>)}
            </NativeSelect>
            <div className="flex min-w-0 overflow-hidden rounded-[10px] border border-input">
              <button type="button" className={cn("px-3 py-2.5 text-xs font-bold", pending.direction === "direct" ? "bg-primary text-primary-foreground" : "border-r border-input")} onClick={() => onPending({ ...pending, direction: "direct" })}>1 {baseCurrency} =</button>
              <button type="button" className={cn("px-3 py-2.5 text-xs font-bold", pending.direction === "inverse" ? "bg-primary text-primary-foreground" : "")} onClick={() => onPending({ ...pending, direction: "inverse" })}>1 {code} =</button>
            </div>
            <Input
              aria-label="Exchange rate"
              className="col-span-2 min-w-[8rem] flex-1 md:col-span-1"
              inputMode="decimal"
              placeholder={`Rate to ${pending.direction === "direct" ? code : baseCurrency}`}
              value={pending.rate}
              onChange={(event) => onPending({ ...pending, rate: event.target.value })}
            />
          </div>
          {/* The row is already part of the trip — the button below only exists for a second
              currency. Saying so in place of a hint is what stops someone filling the row in,
              not noticing an Add button, and losing the rate on submit. */}
          {ready ? (
            <p className="text-xs font-semibold text-success">✓ {draftRateLabel(ready)} — saved when you create the trip.</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {entered ? "Enter the rate as a number, e.g. 300." : `e.g. "1 ${code || "AUD"} = 300 ${baseCurrency}" if that's easier than a decimal rate.`}
            </p>
          )}
          {ready && available.length > 1 ? (
            <button type="button" className="text-[13px] font-bold text-primary" onClick={add}>
              + Add another currency
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
