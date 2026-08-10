"use client"

import Decimal from "decimal.js"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { MoneyRow, SplitType } from "@/features/expense/types"
import type { Participant } from "@/features/trip/types"

const zeroScale = new Set(["IDR", "JPY", "KRW", "VND"])

export function equalPreview(amount: string, currency: string, participants: string[]) {
  if (!participants.length) return new Map<string, string>()
  const scale = zeroScale.has(currency) ? 0 : 2
  const factor = new Decimal(10).pow(scale)
  const units = new Decimal(amount || 0).mul(factor).toDecimalPlaces(0)
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
    try {
      const value = new Decimal(weights.get(id) || 0)
      return value.isPositive() ? value : new Decimal(0)
    } catch {
      return new Decimal(0)
    }
  })
  const weightTotal = rawWeights.reduce((sum, weight) => sum.plus(weight), new Decimal(0))
  if (weightTotal.isZero()) return new Map(ids.map((id) => [id, "0"]))
  const scale = zeroScale.has(currency) ? 0 : 2
  const factor = new Decimal(10).pow(scale)
  const units = new Decimal(amount || 0).mul(factor).toDecimalPlaces(0)
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
  const preview = equalPreview(amount, currency, selected)
  const manualTotal = manual.reduce((sum, row) => sum.plus(row.amount || 0), new Decimal(0))
  const remaining = new Decimal(amount || 0).minus(manualTotal)
  const weightMap = new Map(manual.map((row) => [row.userId, row.weight ?? "0"]))
  const weightPreview = weightedPreview(amount, currency, weightMap)
  const percentTotal = manual.reduce((sum, row) => sum.plus(row.weight || 0), new Decimal(0))
  const shareTotal = manual.reduce((sum, row) => sum.plus(row.weight || 0), new Decimal(0))

  function setWeight(participantId: string, weight: string) {
    const existing = manual.find((item) => item.userId === participantId)
    const preview = weightedPreview(amount, currency, new Map([...weightMap, [participantId, weight]]))
    onManual([
      ...manual.filter((item) => item.userId !== participantId),
      { userId: participantId, amount: preview.get(participantId) ?? existing?.amount ?? "0", weight },
    ])
  }

  return (
    <fieldset className="space-y-3">
      <legend className="font-medium">How is it split?</legend>
      <div className="flex flex-wrap gap-2">
        {MODES.map((mode) => (
          <Button key={mode.value} type="button" variant={type === mode.value ? "default" : "outline"} size="sm" onClick={() => onType(mode.value)}>
            {mode.label}
          </Button>
        ))}
      </div>
      {type === "equal" ? participants.map((participant) => {
        const checked = selected.includes(participant.userId)
        return <label className="flex items-center justify-between rounded border p-2" key={participant.userId}><span className="flex items-center gap-2"><Checkbox checked={checked} onCheckedChange={() => onSelected(checked ? selected.filter((id) => id !== participant.userId) : [...selected, participant.userId])} />{participant.user?.name ?? participant.user?.email ?? "Participant"}</span><span className="tabular-nums">{preview.get(participant.userId) ?? "—"}</span></label>
      }) : null}
      {type === "manual" ? participants.map((participant) => {
        const row = manual.find((item) => item.userId === participant.userId) ?? { userId: participant.userId, amount: "0" }
        return <label className="grid grid-cols-[1fr_10rem] items-center gap-2" key={participant.userId}><span>{participant.user?.name ?? participant.user?.email ?? "Participant"}</span><Input aria-label={`Split for ${participant.user?.name ?? participant.userId}`} value={row.amount} inputMode="decimal" onChange={(event) => onManual([...manual.filter((item) => item.userId !== participant.userId), { userId: participant.userId, amount: event.target.value }])} /></label>
      }) : null}
      {type === "percent" || type === "shares" ? participants.map((participant) => {
        const row = manual.find((item) => item.userId === participant.userId)
        return (
          <div className="grid grid-cols-[1fr_6rem_6rem] items-center gap-2" key={participant.userId}>
            <span>{participant.user?.name ?? participant.user?.email ?? "Participant"}</span>
            <Input
              aria-label={`${type === "percent" ? "Percent" : "Shares"} for ${participant.user?.name ?? participant.userId}`}
              value={row?.weight ?? ""}
              inputMode="decimal"
              onChange={(event) => setWeight(participant.userId, event.target.value)}
            />
            <span className="text-right text-sm tabular-nums text-muted-foreground">
              {weightPreview.get(participant.userId) ?? "—"}
            </span>
          </div>
        )
      }) : null}
      {type === "manual" ? <div className="flex items-center justify-between text-sm"><Button type="button" variant="outline" disabled={!manual.length} onClick={() => { const last = manual.at(-1); if (last) onManual(manual.map((row) => row.userId === last.userId ? { ...row, amount: new Decimal(row.amount || 0).plus(remaining).toString() } : row)) }}>Distribute rest</Button><span className={cn(remaining.equals(0) ? "text-success" : "text-amber-600")}>Remaining: {remaining.toFixed(2)}</span></div> : null}
      {type === "percent" ? <div className="text-right text-sm"><span className={cn(percentTotal.equals(100) ? "text-success" : "text-amber-600")}>Total: {percentTotal.toFixed(2)}%{percentTotal.equals(100) ? "" : " (must equal 100%)"}</span></div> : null}
      {type === "shares" ? <div className="text-right text-sm text-muted-foreground">Total shares: {shareTotal.toFixed(2)}</div> : null}
    </fieldset>
  )
}
