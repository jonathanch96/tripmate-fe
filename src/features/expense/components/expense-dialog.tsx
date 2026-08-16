"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Decimal from "decimal.js"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PayerEditor } from "@/features/expense/components/payer-editor"
import { SplitEditor } from "@/features/expense/components/split-editor"
import { ReceiptWorkflow } from "@/features/receipt/components/receipt-workflow"
import { listExpenseCategories } from "@/features/expense/category-api"
import { expenseCreateSchema } from "@/features/expense/schema"
import type { Expense, ExpensePayload, MoneyRow, SplitType } from "@/features/expense/types"
import { convertFromBase, convertToBase, otherTripCurrencies } from "@/features/finance/rate-pair-helpers"
import type { Rate } from "@/features/finance/types"
import type { Participant, Trip } from "@/features/trip/types"
import { apiFetch } from "@/lib/api-client"
import { qk } from "@/lib/query-keys"

const zeroScaleCurrencies = new Set(["IDR", "JPY", "KRW", "VND"])
const money = (amount: string, currency: string) => `${currency} ${amount}`

export type ExpenseFormState = ExpensePayload & { version?: number }

const WEIGHTED_TYPES = new Set<SplitType>(["percent", "shares"])

export function expenseFormFromExpense(expense: Expense): ExpenseFormState {
  const splitType: SplitType = expense.splitType === "item" ? "manual" : expense.splitType
  return {
    expenseDate: expense.expenseDate, description: expense.description, amount: expense.amount,
    currency: expense.currency, chargedAmount: expense.chargedAmount ?? undefined, chargedCurrency: expense.chargedCurrency ?? undefined,
    categoryId: expense.categoryId, splitType,
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
  const [amount, setAmount] = useState(initial.currency === trip.baseCurrency ? initial.amount : "")
  const currency = trip.baseCurrency
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? "")
  const [splitType, setSplitType] = useState<SplitType>(initial.splitType)
  const [payers, setPayers] = useState<MoneyRow[]>(initial.payers)
  const [selected, setSelected] = useState(initial.participants ?? [])
  const [manual, setManual] = useState<MoneyRow[]>(initial.splits ?? participants.map((participant) => ({ userId: participant.userId, amount: "0" })))
  const [note, setNote] = useState(initial.note ?? "")
  const [activeTab, setActiveTab] = useState<"manual" | "receipt">("manual")

  // "Which currency was this actually charged in" only ever offers currencies the trip already
  // tracks a rate for (Settings > Currencies & exchange rates) — never the full supported list.
  const rates = useQuery({ queryKey: qk.rates(trip.code), queryFn: async () => (await apiFetch<Rate[]>(`/api/trips/${trip.code}/exchange-rates`)).data ?? [] })
  const otherCurrencyOptions = otherTripCurrencies(trip.baseCurrency, rates.data ?? []).map((row) => row.code)

  // The trip amount (above) is always in trip.baseCurrency and is what splitting, balances and
  // totals use. "Actually charged in" is just a record of what the card/account actually shows —
  // it never becomes the expense's stored currency, and it's persisted separately (chargedAmount/
  // chargedCurrency) so it's still there next time the expense is opened for editing.
  const isLegacyForeignCurrency = !initial.chargedCurrency && initial.currency !== trip.baseCurrency
  const [useOtherCurrency, setUseOtherCurrency] = useState(!!initial.chargedCurrency || isLegacyForeignCurrency)
  const [chargedCurrency, setChargedCurrency] = useState(initial.chargedCurrency ?? (isLegacyForeignCurrency ? initial.currency : ""))
  const [chargedAmount, setChargedAmount] = useState(initial.chargedAmount ?? (isLegacyForeignCurrency ? initial.amount : ""))
  function enableOtherCurrency() { setUseOtherCurrency(true); if (!chargedCurrency) setChargedCurrency(otherCurrencyOptions[0] ?? "") }
  function disableOtherCurrency() { setUseOtherCurrency(false); setChargedCurrency(""); setChargedAmount("") }

  // Editing an older expense that was recorded directly in a foreign currency (before the base
  // amount and the actually-charged amount were split apart): treat that stored amount as the
  // actually-charged figure, and derive the base-currency amount from the trip's saved rate as
  // soon as it loads, so the field the user sees is never silently wrong. Adjusted directly during
  // render (React's documented pattern for state derived from data that arrives after mount)
  // rather than in an effect, since it only ever needs to run once.
  const [legacyBaseAmountApplied, setLegacyBaseAmountApplied] = useState(false)
  if (!legacyBaseAmountApplied && isLegacyForeignCurrency && rates.data) {
    setLegacyBaseAmountApplied(true)
    const converted = convertToBase(initial.amount, trip.baseCurrency, initial.currency, rates.data)
    if (converted) setAmount(converted.toFixed(zeroScaleCurrencies.has(trip.baseCurrency) ? 0 : 2))
  }

  const baseScale = zeroScaleCurrencies.has(trip.baseCurrency) ? 0 : 2
  const chargedScale = zeroScaleCurrencies.has(chargedCurrency) ? 0 : 2
  const amountValue = Number.parseFloat(amount)
  const chargedAmountValue = Number.parseFloat(chargedAmount)
  const perTransactionRate = useOtherCurrency && chargedAmountValue > 0 && amountValue > 0 ? new Decimal(chargedAmountValue).div(amountValue) : null
  const convertedToCharged = useOtherCurrency && amountValue > 0 ? convertFromBase(amount, trip.baseCurrency, chargedCurrency, rates.data ?? []) : null
  const otherCurrencyHint = perTransactionRate
    ? `Rate for this transaction: 1 ${trip.baseCurrency} = ${perTransactionRate.toFixed(6)} ${chargedCurrency}.`
    : convertedToCharged
      ? `≈ ${money(convertedToCharged.toFixed(chargedScale), chargedCurrency)} at your saved rate.`
      : `No saved rate for ${chargedCurrency} yet — add one in Settings to see the equivalent.`

  const payload = useMemo<ExpensePayload>(() => ({
    expenseDate: date, description, amount, currency,
    // An empty chargedCurrency is the explicit "clear it" signal the backend expects on update;
    // always sending it (rather than omitting when unchanged) keeps this a full-state save, same
    // as every other field here.
    chargedAmount: useOtherCurrency ? chargedAmount : "", chargedCurrency: useOtherCurrency ? chargedCurrency : "",
    categoryId: categoryId || null, splitType, payers,
    participants: splitType === "equal" ? selected : undefined,
    splits: splitType === "equal" ? undefined : manual.map((row) => WEIGHTED_TYPES.has(splitType) ? { userId: row.userId, amount: row.amount, weight: row.weight } : { userId: row.userId, amount: row.amount }),
    note: note || null,
  }), [amount, categoryId, chargedAmount, chargedCurrency, currency, date, description, manual, note, payers, selected, splitType, useOtherCurrency])
  const valid = expenseCreateSchema.safeParse(payload).success
  function amountChanged(value: string) { setAmount(value); if (payers.length === 1) setPayers([{ ...payers[0], amount: value }]) }
  return <Dialog open={open} onOpenChange={setOpen}>
    {!expense ? <DialogTrigger render={<Button className="font-bold">+ Add expense</Button>} /> : null}
    <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[20px] p-0 sm:max-w-2xl">
      <div className="p-8 pb-0">
        <DialogHeader className="mb-1.5"><DialogTitle className="font-heading text-[19px] font-extrabold">{expense ? "Edit expense" : "Add expense"}</DialogTitle><DialogDescription className="text-[13px]">One bill can have several payers and several people sharing it.</DialogDescription></DialogHeader>
      </div>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "manual" | "receipt")} className="px-8">
        {!expense ? <TabsList className="mb-1 rounded-full bg-muted p-1"><TabsTrigger className="rounded-full" value="manual">Enter manually</TabsTrigger><TabsTrigger className="rounded-full" value="receipt">Scan receipt</TabsTrigger></TabsList> : null}
        <TabsContent value="manual"><div className="grid gap-4 pt-2">
        <div className="space-y-1.5"><Label htmlFor="expense-description">Description</Label><Input id="expense-description" placeholder="Dinner at Aria" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="expense-date">Date</Label><Input id="expense-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="expense-category">Category</Label><NativeSelect id="expense-category" className="w-full" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><NativeSelectOption value="">Uncategorized</NativeSelectOption>{(categories.data ?? []).map((category) => <NativeSelectOption key={category.id} value={category.id}>{category.name}</NativeSelectOption>)}</NativeSelect></div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expense-amount">Amount ({currency})</Label>
          <Input id="expense-amount" inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => amountChanged(event.target.value)} />
          <p className="text-xs text-muted-foreground">This is the trip amount used for splitting, balances and totals.</p>
        </div>

        {!useOtherCurrency ? (
          otherCurrencyOptions.length > 0 ? (
            <button type="button" className="-mt-2 w-fit text-[13px] font-bold text-primary" onClick={enableOtherCurrency}>
              + I actually paid in a different currency
            </button>
          ) : null
        ) : (
          <div className="-mt-2 rounded-xl border border-[oklch(0.9_0.01_250)] bg-[oklch(0.98_0.008_250)] p-4">
            <div className="mb-2.5 flex items-baseline justify-between">
              <span className="text-[13px] font-extrabold">Actually charged in</span>
              <button type="button" className="text-xs font-semibold text-destructive" onClick={disableOtherCurrency}>Remove</button>
            </div>
            <div className="flex gap-2">
              <NativeSelect aria-label="Currency actually charged" className="w-32" value={chargedCurrency} onChange={(event) => setChargedCurrency(event.target.value)}>
                {otherCurrencyOptions.map((code) => <NativeSelectOption key={code} value={code}>{code}</NativeSelectOption>)}
              </NativeSelect>
              <Input aria-label="Amount actually charged" className="flex-1" inputMode="decimal" placeholder={`e.g. ${zeroScaleCurrencies.has(chargedCurrency) ? "750,000" : "750.00"}`} value={chargedAmount} onChange={(event) => setChargedAmount(event.target.value)} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Just a record of what your card or account actually shows — splitting still uses the amount above.</p>
            <p className="mt-1 text-xs text-muted-foreground">{otherCurrencyHint}</p>
          </div>
        )}

        <PayerEditor amount={amount} rows={payers} participants={participants} onChange={setPayers} />
        <SplitEditor amount={amount} currency={currency} type={splitType} selected={selected} manual={manual} participants={participants} onType={setSplitType} onSelected={setSelected} onManual={setManual} />
        <div className="space-y-1.5"><Label htmlFor="expense-note">Note</Label><Textarea id="expense-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></div>
      </div><DialogFooter className="mx-0 mt-4 mb-0 rounded-b-[20px] bg-muted/50 px-8 py-4"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button className="font-bold" disabled={!valid || pending} onClick={() => { onSubmit(expenseCreateSchema.parse(payload)); setOpen(false) }}>{pending ? <><Spinner className="mr-1.5" />Saving…</> : expense ? "Save changes" : "Save expense"}</Button></DialogFooter></TabsContent>
        {!expense ? <TabsContent value="receipt"><ReceiptWorkflow trip={trip} participants={participants} onConverted={() => { setOpen(false); onReceiptConverted?.() }} onManual={(defaults) => {
          setDescription(defaults.description)
          setDate(defaults.expenseDate)
          if (defaults.currency === trip.baseCurrency) {
            setUseOtherCurrency(false); setChargedCurrency(""); setChargedAmount("")
            amountChanged(defaults.amount)
          } else {
            setUseOtherCurrency(true); setChargedCurrency(defaults.currency); setChargedAmount(defaults.amount)
            const converted = convertToBase(defaults.amount, trip.baseCurrency, defaults.currency, rates.data ?? [])
            amountChanged(converted ? converted.toFixed(baseScale) : "")
          }
          setActiveTab("manual")
        }} /></TabsContent> : null}
      </Tabs>
    </DialogContent>
  </Dialog>
}
