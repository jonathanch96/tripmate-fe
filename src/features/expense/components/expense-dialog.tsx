"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PayerEditor } from "@/features/expense/components/payer-editor"
import { SplitEditor } from "@/features/expense/components/split-editor"
import { ReceiptWorkflow } from "@/features/receipt/components/receipt-workflow"
import { listExpenseCategories } from "@/features/expense/category-api"
import { expenseCreateSchema } from "@/features/expense/schema"
import type { Expense, ExpensePayload, MoneyRow, SplitType } from "@/features/expense/types"
import type { Participant, Trip } from "@/features/trip/types"
import { qk } from "@/lib/query-keys"

export type ExpenseFormState = ExpensePayload & { version?: number }

const WEIGHTED_TYPES = new Set<SplitType>(["percent", "shares"])

export function expenseFormFromExpense(expense: Expense): ExpenseFormState {
  const splitType: SplitType = expense.splitType === "item" ? "manual" : expense.splitType
  return {
    expenseDate: expense.expenseDate, description: expense.description, amount: expense.amount,
    currency: expense.currency, categoryId: expense.categoryId, splitType,
    payers: expense.payers.map(({ userId, amount }) => ({ userId, amount })),
    participants: splitType === "equal" ? expense.splits.map(({ userId }) => userId) : undefined,
    splits: splitType !== "equal" ? expense.splits.map(({ userId, amount, weight }) => ({ userId, amount, weight })) : undefined,
    note: expense.note, version: expense.version,
  }
}

export function ExpenseDialog({ trip, participants, expense, pending, open: controlledOpen, onOpenChange, onSubmit, onReceiptConverted }: { trip: Trip; participants: Participant[]; expense?: Expense; pending: boolean; open?: boolean; onOpenChange?: (open: boolean) => void; onSubmit: (payload: ExpensePayload) => void; onReceiptConverted?: () => void }) {
  const initial = expense ? expenseFormFromExpense(expense) : { expenseDate: trip.startDate, description: "", amount: "", currency: trip.baseCurrency, categoryId: null as string | null, splitType: "equal" as const, payers: [{ userId: participants[0]?.userId ?? "", amount: "" }], participants: participants.map((participant) => participant.userId), splits: undefined, note: null }
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const categories = useQuery({ queryKey: qk.expenseCategories(trip.code), queryFn: async () => (await listExpenseCategories(trip.code)).data ?? [] })
  const [description, setDescription] = useState(initial.description)
  const [date, setDate] = useState(initial.expenseDate)
  const [amount, setAmount] = useState(initial.amount)
  const [currency, setCurrency] = useState(initial.currency)
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? "")
  const [splitType, setSplitType] = useState<SplitType>(initial.splitType)
  const [payers, setPayers] = useState<MoneyRow[]>(initial.payers)
  const [selected, setSelected] = useState(initial.participants ?? [])
  const [manual, setManual] = useState<MoneyRow[]>(initial.splits ?? participants.map((participant) => ({ userId: participant.userId, amount: "0" })))
  const [note, setNote] = useState(initial.note ?? "")
  const [activeTab, setActiveTab] = useState<"manual" | "receipt">("manual")
  const payload = useMemo<ExpensePayload>(() => ({ expenseDate: date, description, amount, currency, categoryId: categoryId || null, splitType, payers, participants: splitType === "equal" ? selected : undefined, splits: splitType === "equal" ? undefined : manual.map((row) => WEIGHTED_TYPES.has(splitType) ? { userId: row.userId, amount: row.amount, weight: row.weight } : { userId: row.userId, amount: row.amount }), note: note || null }), [amount, categoryId, currency, date, description, manual, note, payers, selected, splitType])
  const valid = expenseCreateSchema.safeParse(payload).success
  function amountChanged(value: string) { setAmount(value); if (payers.length === 1) setPayers([{ ...payers[0], amount: value }]) }
  return <Dialog open={open} onOpenChange={setOpen}>
    {!expense ? <DialogTrigger render={<Button className="font-bold" />}><Plus />Add expense</DialogTrigger> : null}
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[680px]">
      <DialogHeader><DialogTitle>{expense ? "Edit expense" : "Add expense"}</DialogTitle><DialogDescription>One bill can have several payers and several people sharing it.</DialogDescription></DialogHeader>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "manual" | "receipt")}>
        {!expense ? <TabsList><TabsTrigger value="manual">Enter manually</TabsTrigger><TabsTrigger value="receipt">Scan receipt</TabsTrigger></TabsList> : null}
        <TabsContent value="manual"><div className="grid gap-4 pt-2">
        <label>Description<Input value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <div className="grid gap-3 md:grid-cols-2"><label>Date<Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Category<NativeSelect className="w-full" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><NativeSelectOption value="">Uncategorized</NativeSelectOption>{(categories.data ?? []).map((category) => <NativeSelectOption key={category.id} value={category.id}>{category.name}</NativeSelectOption>)}</NativeSelect></label></div>
        <div className="grid gap-3 md:grid-cols-2"><label>Amount<Input inputMode="decimal" value={amount} onChange={(event) => amountChanged(event.target.value)} /></label><label>Currency<NativeSelect className="w-full" value={currency} onChange={(event) => setCurrency(event.target.value)}><NativeSelectOption value={trip.baseCurrency}>{trip.baseCurrency}</NativeSelectOption>{trip.settings.multiCurrencyEnabled ? ["PHP", "IDR", "USD", "EUR"].filter((value) => value !== trip.baseCurrency).map((value) => <NativeSelectOption value={value} key={value}>{value}</NativeSelectOption>) : null}</NativeSelect></label></div>
        <PayerEditor amount={amount} rows={payers} participants={participants} onChange={setPayers} />
        <SplitEditor amount={amount} currency={currency} type={splitType} selected={selected} manual={manual} participants={participants} onType={setSplitType} onSelected={setSelected} onManual={setManual} />
        <label>Note<Textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
      </div><DialogFooter className="mt-4"><Button disabled={!valid || pending} onClick={() => { onSubmit(expenseCreateSchema.parse(payload)); setOpen(false) }}>{pending ? "Saving…" : expense ? "Save changes" : "Save expense"}</Button></DialogFooter></TabsContent>
        {!expense ? <TabsContent value="receipt"><ReceiptWorkflow trip={trip} participants={participants} onConverted={() => { setOpen(false); onReceiptConverted?.() }} onManual={(defaults) => { setDescription(defaults.description); setAmount(defaults.amount); setCurrency(defaults.currency); setDate(defaults.expenseDate); if (payers.length === 1) setPayers([{ ...payers[0], amount: defaults.amount }]); setActiveTab("manual") }} /></TabsContent> : null}
      </Tabs>
    </DialogContent>
  </Dialog>
}
