"use client"

import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { MoneyInput } from "@/components/ui/money-input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { displayScale, groupThousands, safeDecimal } from "@/lib/money"
import { participantName } from "@/lib/participant-name"
import { cn } from "@/lib/utils"
import type { MoneyRow } from "@/features/expense/types"
import type { Participant } from "@/features/trip/types"

export function PayerEditor({ amount, currency, rows, participants, onChange }: { amount: string; currency: string; rows: MoneyRow[]; participants: Participant[]; onChange: (rows: MoneyRow[]) => void }) {
  const paid = rows.reduce((sum, row) => sum.plus(safeDecimal(row.amount)), safeDecimal(0))
  const remaining = safeDecimal(amount).minus(paid)
  return (
    <fieldset className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <legend className="text-sm font-semibold">Who paid?</legend>
        <span className={cn("text-xs font-semibold", remaining.equals(0) ? "text-success" : "text-amber-600 dark:text-amber-400")}>Remaining: {groupThousands(remaining.toFixed(displayScale(currency)))}</span>
      </div>
      {rows.map((row, index) => (
        <div className="flex gap-2" key={`${row.userId}-${index}`}>
          <NativeSelect className="flex-[2]" aria-label={`Payer ${index + 1}`} value={row.userId} onChange={(event) => onChange(rows.map((item, i) => i === index ? { ...item, userId: event.target.value } : item))}>
            <NativeSelectOption value="">Choose payer</NativeSelectOption>
            {participants.map((participant) => <NativeSelectOption key={participant.userId} value={participant.userId}>{participantName(participant)}</NativeSelectOption>)}
          </NativeSelect>
          <MoneyInput className="flex-1" aria-label={`Payer ${index + 1} amount`} placeholder="0.00" value={row.amount} onChange={(value) => onChange(rows.map((item, i) => i === index ? { ...item, amount: value } : item))} />
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
