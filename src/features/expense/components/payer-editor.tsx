"use client"

import Decimal from "decimal.js"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { participantName } from "@/lib/participant-name"
import { cn } from "@/lib/utils"
import type { MoneyRow } from "@/features/expense/types"
import type { Participant } from "@/features/trip/types"

export function PayerEditor({ amount, rows, participants, onChange }: { amount: string; rows: MoneyRow[]; participants: Participant[]; onChange: (rows: MoneyRow[]) => void }) {
  const paid = rows.reduce((sum, row) => sum.plus(row.amount || 0), new Decimal(0))
  const remaining = new Decimal(amount || 0).minus(paid)
  return (
    <fieldset className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <legend className="text-sm font-semibold">Who paid?</legend>
        <span className={cn("text-xs font-semibold", remaining.equals(0) ? "text-success" : "text-amber-600 dark:text-amber-400")}>Remaining: {remaining.toFixed(2)}</span>
      </div>
      {rows.map((row, index) => (
        <div className="flex gap-2" key={`${row.userId}-${index}`}>
          <NativeSelect className="flex-[2]" aria-label={`Payer ${index + 1}`} value={row.userId} onChange={(event) => onChange(rows.map((item, i) => i === index ? { ...item, userId: event.target.value } : item))}>
            <NativeSelectOption value="">Choose payer</NativeSelectOption>
            {participants.map((participant) => <NativeSelectOption key={participant.userId} value={participant.userId}>{participantName(participant)}</NativeSelectOption>)}
          </NativeSelect>
          <Input className="flex-1" aria-label={`Payer ${index + 1} amount`} inputMode="decimal" placeholder="0.00" value={row.amount} onChange={(event) => onChange(rows.map((item, i) => i === index ? { ...item, amount: event.target.value } : item))} />
          {rows.length > 1 ? (
            <Button type="button" variant="outline" size="sm" aria-label={`Remove payer ${index + 1}`} onClick={() => onChange(rows.filter((_, i) => i !== index))}>
              <X className="size-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, { userId: "", amount: "" }])}>+ Add payer</Button>
    </fieldset>
  )
}
