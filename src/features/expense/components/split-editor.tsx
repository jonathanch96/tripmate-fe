"use client"

import Decimal from "decimal.js"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import type { MoneyRow } from "@/features/expense/types"
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

export function SplitEditor({ amount, currency, type, selected, manual, participants, onType, onSelected, onManual }: { amount: string; currency: string; type: "equal" | "manual"; selected: string[]; manual: MoneyRow[]; participants: Participant[]; onType: (value: "equal" | "manual") => void; onSelected: (value: string[]) => void; onManual: (value: MoneyRow[]) => void }) {
  const preview = equalPreview(amount, currency, selected)
  const manualTotal = manual.reduce((sum, row) => sum.plus(row.amount || 0), new Decimal(0))
  const remaining = new Decimal(amount || 0).minus(manualTotal)
  return (
    <fieldset className="space-y-3">
      <legend className="font-medium">How is it split?</legend>
      <div className="flex gap-2"><Button type="button" variant={type === "equal" ? "default" : "outline"} onClick={() => onType("equal")}>Equal</Button><Button type="button" variant={type === "manual" ? "default" : "outline"} onClick={() => onType("manual")}>Manual</Button></div>
      {type === "equal" ? participants.map((participant) => {
        const checked = selected.includes(participant.userId)
        return <label className="flex items-center justify-between rounded border p-2" key={participant.userId}><span className="flex items-center gap-2"><Checkbox checked={checked} onCheckedChange={() => onSelected(checked ? selected.filter((id) => id !== participant.userId) : [...selected, participant.userId])} />{participant.user?.name ?? participant.user?.email ?? "Participant"}</span><span>{preview.get(participant.userId) ?? "—"}</span></label>
      }) : participants.map((participant) => {
        const row = manual.find((item) => item.userId === participant.userId) ?? { userId: participant.userId, amount: "0" }
        return <label className="grid grid-cols-[1fr_10rem] items-center gap-2" key={participant.userId}><span>{participant.user?.name ?? participant.user?.email ?? "Participant"}</span><Input aria-label={`Split for ${participant.user?.name ?? participant.userId}`} value={row.amount} inputMode="decimal" onChange={(event) => onManual([...manual.filter((item) => item.userId !== participant.userId), { userId: participant.userId, amount: event.target.value }])} /></label>
      })}
      {type === "manual" ? <div className="flex items-center justify-between text-sm"><Button type="button" variant="outline" disabled={!manual.length} onClick={() => { const last = manual.at(-1); if (last) onManual(manual.map((row) => row.userId === last.userId ? { ...row, amount: new Decimal(row.amount || 0).plus(remaining).toString() } : row)) }}>Distribute rest</Button><span className={remaining.equals(0) ? "text-emerald-600" : "text-amber-600"}>Remaining: {remaining.toFixed(2)}</span></div> : null}
    </fieldset>
  )
}
