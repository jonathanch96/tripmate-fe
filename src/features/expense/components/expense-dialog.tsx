"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { PayerEditor } from "@/features/expense/components/payer-editor"
import { SplitEditor } from "@/features/expense/components/split-editor"
import { expenseCreateSchema } from "@/features/expense/schema"
import type { ExpensePayload, MoneyRow } from "@/features/expense/types"
import type { Participant, Trip } from "@/features/trip/types"

export function ExpenseDialog({ trip, participants, pending, onSubmit }: { trip: Trip; participants: Participant[]; pending: boolean; onSubmit: (payload: ExpensePayload) => void }) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(trip.startDate)
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState(trip.baseCurrency)
  const [splitType, setSplitType] = useState<"equal" | "manual">("equal")
  const [payers, setPayers] = useState<MoneyRow[]>([{ userId: participants[0]?.userId ?? "", amount: "" }])
  const [selected, setSelected] = useState(participants.map((participant) => participant.userId))
  const [manual, setManual] = useState<MoneyRow[]>(participants.map((participant) => ({ userId: participant.userId, amount: "0" })))
  const [note, setNote] = useState("")
  const payload = useMemo<ExpensePayload>(() => ({ expenseDate: date, description, amount, currency, splitType, payers, participants: splitType === "equal" ? selected : undefined, splits: splitType === "manual" ? manual : undefined, note: note || null }), [amount, currency, date, description, manual, note, payers, selected, splitType])
  const valid = expenseCreateSchema.safeParse(payload).success
  function amountChanged(value: string) { setAmount(value); if (payers.length === 1) setPayers([{ ...payers[0], amount: value }]) }
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger render={<Button />}>Add expense</DialogTrigger>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Add expense</DialogTitle><DialogDescription>One bill can have several payers and several people sharing it.</DialogDescription></DialogHeader>
      <div className="grid gap-4">
        <div className="grid gap-2 md:grid-cols-2"><label>Description<Input value={description} onChange={(event) => setDescription(event.target.value)} /></label><label>Date<Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Amount<Input inputMode="decimal" value={amount} onChange={(event) => amountChanged(event.target.value)} /></label><label>Currency<NativeSelect value={currency} onChange={(event) => setCurrency(event.target.value)}><NativeSelectOption value={trip.baseCurrency}>{trip.baseCurrency}</NativeSelectOption>{trip.settings.multiCurrencyEnabled ? ["PHP", "IDR", "USD", "EUR"].filter((value) => value !== trip.baseCurrency).map((value) => <NativeSelectOption value={value} key={value}>{value}</NativeSelectOption>) : null}</NativeSelect></label></div>
        <PayerEditor amount={amount} rows={payers} participants={participants} onChange={setPayers} />
        <SplitEditor amount={amount} currency={currency} type={splitType} selected={selected} manual={manual} participants={participants} onType={setSplitType} onSelected={setSelected} onManual={setManual} />
        <label>Note<Textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <p className="text-xs text-muted-foreground">Receipt import arrives in Sprint 5.</p>
      </div>
      <DialogFooter><Button disabled={!valid || pending} onClick={() => { onSubmit(expenseCreateSchema.parse(payload)); setOpen(false) }}>{pending ? "Saving…" : "Save expense"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
