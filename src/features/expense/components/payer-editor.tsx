"use client"

import Decimal from "decimal.js"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import type { MoneyRow } from "@/features/expense/types"
import type { Participant } from "@/features/trip/types"

export function PayerEditor({ amount, rows, participants, onChange }: { amount: string; rows: MoneyRow[]; participants: Participant[]; onChange: (rows: MoneyRow[]) => void }) {
  const paid = rows.reduce((sum, row) => sum.plus(row.amount || 0), new Decimal(0))
  const remaining = new Decimal(amount || 0).minus(paid)
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">Who paid?</legend>
      {rows.map((row, index) => (
        <div className="grid grid-cols-[1fr_10rem_auto] gap-2" key={`${row.userId}-${index}`}>
          <NativeSelect aria-label={`Payer ${index + 1}`} value={row.userId} onChange={(event) => onChange(rows.map((item, i) => i === index ? { ...item, userId: event.target.value } : item))}>
            <NativeSelectOption value="">Choose payer</NativeSelectOption>
            {participants.map((participant) => <NativeSelectOption key={participant.userId} value={participant.userId}>{participant.user?.name ?? participant.user?.email ?? "Participant"}</NativeSelectOption>)}
          </NativeSelect>
          <Input aria-label={`Payer ${index + 1} amount`} inputMode="decimal" value={row.amount} onChange={(event) => onChange(rows.map((item, i) => i === index ? { ...item, amount: event.target.value } : item))} />
          <Button type="button" variant="outline" onClick={() => onChange(rows.filter((_, i) => i !== index))}>Remove</Button>
        </div>
      ))}
      <div className="flex items-center justify-between text-sm">
        <Button type="button" variant="outline" onClick={() => onChange([...rows, { userId: "", amount: "0" }])}>Add payer</Button>
        <span className={remaining.equals(0) ? "text-emerald-600" : "text-amber-600"}>Remaining: {remaining.toFixed(2)}</span>
      </div>
    </fieldset>
  )
}
