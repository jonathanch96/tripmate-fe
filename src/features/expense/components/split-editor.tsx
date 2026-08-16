"use client"

import Decimal from "decimal.js"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { MoneyInput } from "@/components/ui/money-input"
import { displayScale, formatMoney, groupThousands, safeDecimal } from "@/lib/money"
import { participantName } from "@/lib/participant-name"
import { cn } from "@/lib/utils"
import type { MoneyRow, SplitType } from "@/features/expense/types"
import type { Participant } from "@/features/trip/types"

export function equalPreview(amount: string, currency: string, participants: string[]) {
  if (!participants.length) return new Map<string, string>()
  const scale = displayScale(currency)
  const factor = new Decimal(10).pow(scale)
  const units = safeDecimal(amount).mul(factor).toDecimalPlaces(0)
  const base = units.dividedToIntegerBy(participants.length)
  const remainder = units.minus(base.mul(participants.length)).toNumber()
  return new Map([...participants].sort().map((id, index) => [id, base.plus(index < remainder ? 1 : 0).div(factor).toFixed(scale)]))
}

// Mirrors the backend's money.SplitProportional (largest-remainder method) closely enough for a
// live preview; the persisted amounts always come back from the server's own recomputation.
export function weightedPreview(amount: string, currency: string, weights: Map<string, string>) {
  const ids = [...weights.keys()].sort()
  if (!ids.length) return new Map<string, string>()
  const rawWeights = ids.map((id) => {
    const value = safeDecimal(weights.get(id))
    return value.isPositive() ? value : new Decimal(0)
  })
  const weightTotal = rawWeights.reduce((sum, weight) => sum.plus(weight), new Decimal(0))
  if (weightTotal.isZero()) return new Map(ids.map((id) => [id, "0"]))
  const scale = displayScale(currency)
  const factor = new Decimal(10).pow(scale)
  const units = safeDecimal(amount).mul(factor).toDecimalPlaces(0)
  const exact = rawWeights.map((weight) => units.mul(weight).div(weightTotal))
  const floors = exact.map((value) => value.toDecimalPlaces(0, Decimal.ROUND_DOWN))
  const fracs = exact.map((value, index) => value.minus(floors[index]))
  const allocated = floors.reduce((sum, value) => sum.plus(value), new Decimal(0))
  const remainder = units.minus(allocated).toNumber()
  const order = ids.map((_, index) => index).sort((a, b) => fracs[b].minus(fracs[a]).toNumber())
  const minor = [...floors]
  for (let i = 0; i < remainder; i++) {
    const index = order[i % order.length]!
    minor[index] = minor[index]!.plus(1)
  }
  return new Map(ids.map((id, index) => [id, minor[index]!.div(factor).toFixed(scale)]))
}

const MODES: Array<{ value: SplitType; label: string }> = [
  { value: "equal", label: "Equal" },
  { value: "manual", label: "Exact" },
  { value: "percent", label: "Percentage" },
  { value: "shares", label: "Shares" },
]

export function SplitEditor({ amount, currency, type, selected, manual, participants, onType, onSelected, onManual }: { amount: string; currency: string; type: SplitType; selected: string[]; manual: MoneyRow[]; participants: Participant[]; onType: (value: SplitType) => void; onSelected: (value: string[]) => void; onManual: (value: MoneyRow[]) => void }) {
  const [distributeOpen, setDistributeOpen] = useState(false)
  const preview = equalPreview(amount, currency, selected)
  const manualTotal = manual.reduce((sum, row) => sum.plus(safeDecimal(row.amount)), new Decimal(0))
  const remaining = safeDecimal(amount).minus(manualTotal)
  const weightMap = new Map(manual.map((row) => [row.userId, row.weight ?? "0"]))
  const weightPreview = weightedPreview(amount, currency, weightMap)
  const percentTotal = manual.reduce((sum, row) => sum.plus(safeDecimal(row.weight)), new Decimal(0))
  const shareTotal = manual.reduce((sum, row) => sum.plus(safeDecimal(row.weight)), new Decimal(0))

  function setWeight(participantId: string, weight: string) {
    const existing = manual.find((item) => item.userId === participantId)
    const preview = weightedPreview(amount, currency, new Map([...weightMap, [participantId, weight]]))
    onManual([
      ...manual.filter((item) => item.userId !== participantId),
      { userId: participantId, amount: preview.get(participantId) ?? existing?.amount ?? "0", weight },
    ])
  }

  // Adds the full remaining amount to whoever the user picks in the modal, leaving every other
  // participant's amount untouched - rather than always dumping it on the last row in the list.
  function distributeRestTo(participantId: string) {
    const row = manual.find((item) => item.userId === participantId) ?? { userId: participantId, amount: "0" }
    const updated = safeDecimal(row.amount).plus(remaining).toFixed(displayScale(currency))
    onManual([...manual.filter((item) => item.userId !== participantId), { ...row, amount: updated }])
    setDistributeOpen(false)
  }

  const remainingLabel =
    type === "equal" ? `${selected.length} people`
    : type === "manual" ? (remaining.equals(0) ? "Fully allocated" : `${formatMoney(remaining.abs(), currency)} ${remaining.isNegative() ? "over" : "left"}`)
    : type === "percent" ? `${percentTotal.toFixed(2)}% of 100%`
    : `${shareTotal.toFixed(2)} total shares`
  const remainingColor =
    type === "equal" ? "text-muted-foreground"
    : type === "manual" ? (remaining.equals(0) ? "text-success" : "text-amber-600 dark:text-amber-400")
    : type === "percent" ? (percentTotal.equals(100) ? "text-success" : "text-amber-600 dark:text-amber-400")
    : "text-muted-foreground"

  return (
    <fieldset className="space-y-2.5">
      <div className="flex gap-2">
        {MODES.map((mode) => (
          <Button key={mode.value} type="button" variant={type === mode.value ? "default" : "outline"} size="sm" className="flex-1" onClick={() => onType(mode.value)}>
            {mode.label}
          </Button>
        ))}
      </div>
      <div className="flex items-baseline justify-between">
        <legend className="text-sm font-semibold">How is it split?</legend>
        <span className={cn("text-xs font-semibold", remainingColor)}>{remainingLabel}</span>
      </div>
      <div className="space-y-1 rounded-lg border px-3">
        {type === "equal" ? participants.map((participant) => {
          const checked = selected.includes(participant.userId)
          return <label className="flex items-center gap-3 border-b py-2.5 last:border-0" key={participant.userId}>
            <Checkbox checked={checked} onCheckedChange={() => onSelected(checked ? selected.filter((id) => id !== participant.userId) : [...selected, participant.userId])} />
            <span className="flex-1 text-sm font-medium">{participantName(participant)}</span>
            <span className="text-sm font-semibold tabular-nums">{checked ? groupThousands(preview.get(participant.userId) ?? "0") : "—"}</span>
          </label>
        }) : null}
        {type === "manual" ? participants.map((participant) => {
          const row = manual.find((item) => item.userId === participant.userId) ?? { userId: participant.userId, amount: "0" }
          return <div className="flex items-center gap-3 border-b py-2.5 last:border-0" key={participant.userId}>
            <span className="flex-1 text-sm font-medium">{participantName(participant)}</span>
            <MoneyInput className="w-28 text-right" aria-label={`Split for ${participantName(participant)}`} value={row.amount} placeholder="0.00" onChange={(value) => onManual([...manual.filter((item) => item.userId !== participant.userId), { userId: participant.userId, amount: value }])} />
          </div>
        }) : null}
        {type === "percent" || type === "shares" ? participants.map((participant) => {
          const row = manual.find((item) => item.userId === participant.userId)
          return (
            <div className="flex items-center gap-3 border-b py-2.5 last:border-0" key={participant.userId}>
              <span className="flex-1 text-sm font-medium">{participantName(participant)}</span>
              <Input
                className="w-20 text-right"
                aria-label={`${type === "percent" ? "Percent" : "Shares"} for ${participantName(participant)}`}
                value={row?.weight ?? ""}
                inputMode="decimal"
                placeholder={type === "percent" ? "0%" : "0"}
                onChange={(event) => setWeight(participant.userId, event.target.value)}
              />
              <span className="w-20 text-right text-sm font-semibold tabular-nums">
                {groupThousands(weightPreview.get(participant.userId) ?? "0")}
              </span>
            </div>
          )
        }) : null}
      </div>
      {type === "manual" ? (
        <>
          <Button type="button" variant="outline" size="sm" disabled={!manual.length} onClick={() => setDistributeOpen(true)}>
            Distribute rest
          </Button>
          <Dialog open={distributeOpen} onOpenChange={setDistributeOpen}>
            <DialogContent className="rounded-[20px] sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-heading text-base font-extrabold">Who gets the rest?</DialogTitle>
                <DialogDescription className="text-[13px]">Adds the remaining {formatMoney(remaining, currency)} to whoever you pick — everyone else stays as they are.</DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                {participants.map((participant) => (
                  <Button key={participant.userId} type="button" variant="outline" className="w-full justify-start font-semibold" onClick={() => distributeRestTo(participant.userId)}>
                    {participantName(participant)}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </fieldset>
  )
}
