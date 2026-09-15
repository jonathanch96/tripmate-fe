"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import type { RateDraft } from "@/features/finance/rate-pair-helpers"
import { SUPPORTED_CURRENCIES } from "@/lib/currencies"
import { cn } from "@/lib/utils"

// How a drafted rate reads back to the planner, in the same "1 unit of `from` = `rate` units of
// `to`" direction the backend stores it in.
export function draftRateLabel(draft: RateDraft) {
  return `1 ${draft.from} = ${draft.rate} ${draft.to}`
}

// The add-a-currency form from the trip's settings page, but holding its rows in local state
// instead of PUTting them: on the create page there is no trip to attach a rate to yet, so the
// drafts are saved right after the trip itself is created.
export function CurrencyRateDraftList({ baseCurrency, drafts, onChange }: {
  baseCurrency: string
  drafts: RateDraft[]
  onChange: (drafts: RateDraft[]) => void
}) {
  const [newCode, setNewCode] = useState("")
  const [direction, setDirection] = useState<"direct" | "inverse">("direct")
  const [rateInput, setRateInput] = useState("")

  const taken = new Set([baseCurrency, ...drafts.flatMap((draft) => [draft.from, draft.to])])
  const available = SUPPORTED_CURRENCIES.filter((code) => !taken.has(code))
  const code: string = available.some((option) => option === newCode) ? newCode : (available[0] ?? "")
  const entered = rateInput.trim()
  const previewLabel = entered
    ? (direction === "direct" ? `1 ${baseCurrency} = ${entered} ${code}` : `1 ${code} = ${entered} ${baseCurrency}`)
    : `e.g. "1 ${code || "AUD"} = 300 ${baseCurrency}" if that's easier than a decimal rate.`

  function add() {
    if (!code || !entered) return
    onChange([...drafts, direction === "direct"
      ? { from: baseCurrency, to: code, rate: entered }
      : { from: code, to: baseCurrency, rate: entered }])
    setNewCode("")
    setRateInput("")
  }

  return (
    <div className="space-y-2.5">
      {drafts.length ? (
        <div className="rounded-lg border">
          {drafts.map((draft, index) => (
            <div key={`${draft.from}-${draft.to}`} className="flex items-center gap-3 border-b px-4 py-2.5 text-sm last:border-0">
              <span className="font-bold">{draft.from === baseCurrency ? draft.to : draft.from}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">{draftRateLabel(draft)}</span>
              <button
                type="button"
                className="text-xs font-semibold text-destructive"
                aria-label={`Remove ${draft.from === baseCurrency ? draft.to : draft.from}`}
                onClick={() => onChange(drafts.filter((_, position) => position !== index))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {available.length ? (
        <>
          <div className="grid grid-cols-2 gap-2.5 md:flex md:flex-wrap">
            <NativeSelect aria-label="Currency to add" value={code} onChange={(event) => setNewCode(event.target.value)}>
              {available.map((option) => <NativeSelectOption key={option} value={option}>{option}</NativeSelectOption>)}
            </NativeSelect>
            <div className="flex min-w-0 overflow-hidden rounded-[10px] border border-input">
              <button type="button" className={cn("px-3 py-2.5 text-xs font-bold", direction === "direct" ? "bg-primary text-primary-foreground" : "border-r border-input")} onClick={() => setDirection("direct")}>1 {baseCurrency} =</button>
              <button type="button" className={cn("px-3 py-2.5 text-xs font-bold", direction === "inverse" ? "bg-primary text-primary-foreground" : "")} onClick={() => setDirection("inverse")}>1 {code} =</button>
            </div>
            <Input
              aria-label="Exchange rate"
              className="col-span-2 min-w-[8rem] flex-1 md:col-span-1"
              inputMode="decimal"
              placeholder={`Rate to ${direction === "direct" ? code : baseCurrency}`}
              value={rateInput}
              onChange={(event) => setRateInput(event.target.value)}
            />
            <Button type="button" variant="outline" className="col-span-2 font-bold md:col-span-1" onClick={add}>Add currency</Button>
          </div>
          <p className="text-xs text-muted-foreground">{previewLabel}</p>
        </>
      ) : null}
    </div>
  )
}
