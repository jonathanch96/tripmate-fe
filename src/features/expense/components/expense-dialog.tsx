"use client"

import { useMemo, useState, type ReactElement } from "react"
import { useQuery } from "@tanstack/react-query"
import Decimal from "decimal.js"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoneyInput } from "@/components/ui/money-input"
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
import { convertToBase, otherTripCurrencies } from "@/features/finance/rate-pair-helpers"
import type { Rate } from "@/features/finance/types"
import type { Participant, Trip } from "@/features/trip/types"
import { apiFetch } from "@/lib/api-client"
import { displayScale, formatMoney } from "@/lib/money"
import { qk } from "@/lib/query-keys"

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

export function ExpenseDialog({ trip, participants, expense, pending, open: controlledOpen, onOpenChange, onSubmit, onReceiptConverted, trigger }: { trip: Trip; participants: Participant[]; expense?: Expense; pending: boolean; open?: boolean; onOpenChange?: (open: boolean) => void; onSubmit: (payload: ExpensePayload) => void; onReceiptConverted?: () => void; trigger?: ReactElement }) {
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

  // The currency picker only offers currencies the trip already tracks a rate for (Settings >
  // Currencies & exchange rates), plus whatever the expense is already stored in — so opening an
  // older expense whose currency later lost its saved rate still shows correctly instead of
  // silently falling back to some other option.
  const rates = useQuery({ queryKey: qk.rates(trip.code), queryFn: async () => (await apiFetch<Rate[]>(`/api/trips/${trip.code}/exchange-rates`)).data ?? [] })
  const currencyOptions = Array.from(new Set([trip.baseCurrency, currency, ...otherTripCurrencies(trip.baseCurrency, rates.data ?? []).map((row) => row.code)]))

  // A new expense defaults to base currency (above) before the trip's rates have loaded - most
  // spend on a trip happens in the currency you're actually visiting, not back home, so once a
  // saved foreign currency is available, prefer it. Only for a brand-new expense, only once, and
  // never overriding an expense being edited (which always shows its own stored currency).
  const [defaultCurrencyApplied, setDefaultCurrencyApplied] = useState(!!expense)
  if (!defaultCurrencyApplied && rates.data) {
    setDefaultCurrencyApplied(true)
    const preferred = otherTripCurrencies(trip.baseCurrency, rates.data)[0]?.code
    if (preferred) setCurrency(preferred)
  }

  // Splitting, payers and balances all run in whatever currency is picked above. When that's not
  // the trip's base currency, "actually charged" is an optional per-transaction override: the exact
  // base-currency total (e.g. a card statement) that supersedes the trip's saved rate for this one
  // expense, without touching any other expense or the trip's Settings rate.
  const showChargedOption = currency !== trip.baseCurrency
  const [chargedExpanded, setChargedExpanded] = useState(!!initial.chargedAmount || !!initial.chargedCurrency)
  const [chargedAmount, setChargedAmount] = useState(initial.chargedAmount ?? "")
  function enableCharged() { setChargedExpanded(true) }
  function disableCharged() { setChargedExpanded(false); setChargedAmount("") }

  const amountValue = Number.parseFloat(amount)
  const chargedAmountValue = Number.parseFloat(chargedAmount)
  const perTransactionRate = chargedAmountValue > 0 && amountValue > 0 ? new Decimal(chargedAmountValue).div(amountValue) : null
  const convertedToBasePreview = amountValue > 0 ? convertToBase(amount, trip.baseCurrency, currency, rates.data ?? []) : null
  const chargedHint = perTransactionRate
    ? `Rate for this transaction: 1 ${currency} = ${perTransactionRate.toFixed(6)} ${trip.baseCurrency}.`
    : convertedToBasePreview
      ? `≈ ${formatMoney(convertedToBasePreview, trip.baseCurrency)} at your saved rate.`
      : `No saved rate for ${currency} yet — add one in Settings to see the equivalent.`

  const payload = useMemo<ExpensePayload>(() => ({
    expenseDate: date, description, amount, currency,
    // An empty chargedCurrency is the explicit "clear it" signal the backend expects on update;
    // always sending it (rather than omitting when unchanged) keeps this a full-state save, same
    // as every other field here.
    chargedAmount: showChargedOption && chargedExpanded ? chargedAmount : "", chargedCurrency: showChargedOption && chargedExpanded ? trip.baseCurrency : "",
    categoryId: categoryId || null, splitType, payers,
    participants: splitType === "equal" ? selected : undefined,
    splits: splitType === "equal" ? undefined : manual.map((row) => WEIGHTED_TYPES.has(splitType) ? { userId: row.userId, amount: row.amount, weight: row.weight } : { userId: row.userId, amount: row.amount }),
    note: note || null,
  }), [amount, categoryId, chargedAmount, chargedExpanded, currency, date, description, manual, note, payers, selected, splitType, showChargedOption, trip.baseCurrency])
  const valid = expenseCreateSchema.safeParse(payload).success
  function amountChanged(value: string) { setAmount(value); if (payers.length === 1) setPayers([{ ...payers[0], amount: value }]) }
  function currencyChanged(value: string) { setCurrency(value); if (value === trip.baseCurrency) disableCharged() }
  // Shares defaults every participant to 0 rather than blank, so entering a share count for just
  // the people actually splitting the bill is enough - everyone else implicitly sits it out
  // instead of blocking Save until every row is touched.
  function splitTypeChanged(type: SplitType) {
    setSplitType(type)
    if (type === "shares") {
      setManual(participants.map((participant) => {
        const existing = manual.find((row) => row.userId === participant.userId)
        return existing?.weight !== undefined ? existing : { userId: participant.userId, amount: existing?.amount ?? "0", weight: "0" }
      }))
    }
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    {!expense ? <DialogTrigger render={trigger ?? <Button className="font-bold" disabled={trip.isArchived}>+ Add expense</Button>} /> : null}
    <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[20px] p-0 max-md:inset-0 max-md:h-dvh max-md:max-h-dvh max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none sm:max-w-2xl">
      <div className="p-5 pb-0 md:p-8 md:pb-0">
        <DialogHeader className="mb-1.5"><DialogTitle className="font-heading text-[19px] font-extrabold">{expense ? "Edit expense" : "Add expense"}</DialogTitle><DialogDescription className="text-[13px]">One bill can have several payers and several people sharing it.</DialogDescription></DialogHeader>
      </div>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "manual" | "receipt")} className="px-5 md:px-8">
        {!expense ? <TabsList className="mb-1 rounded-full bg-muted p-1"><TabsTrigger className="rounded-full" value="manual">Enter manually</TabsTrigger><TabsTrigger className="rounded-full" value="receipt">Scan receipt</TabsTrigger></TabsList> : null}
        <TabsContent value="manual"><div className="grid gap-4 pt-2">
        <div className="space-y-1.5"><Label htmlFor="expense-description">Description</Label><Input id="expense-description" placeholder="Dinner at Aria" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="expense-date">Date</Label><Input id="expense-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="expense-category">Category</Label><NativeSelect id="expense-category" className="w-full" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><NativeSelectOption value="">Uncategorized</NativeSelectOption>{(categories.data ?? []).map((category) => <NativeSelectOption key={category.id} value={category.id}>{category.name}</NativeSelectOption>)}</NativeSelect></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="expense-amount">Amount</Label>
            <MoneyInput id="expense-amount" placeholder="0.00" value={amount} onChange={amountChanged} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expense-currency">Currency</Label>
            {trip.settings.multiCurrencyEnabled ? (
              <NativeSelect id="expense-currency" className="w-full" value={currency} onChange={(event) => currencyChanged(event.target.value)}>
                {currencyOptions.map((code) => <NativeSelectOption key={code} value={code}>{code}</NativeSelectOption>)}
              </NativeSelect>
            ) : (
              <Input id="expense-currency" value={trip.baseCurrency} disabled readOnly />
            )}
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">{showChargedOption ? "Splitting and balances use this amount, converted to the trip's base currency below." : "This is the trip's base currency."}</p>

        {!showChargedOption ? null : !chargedExpanded ? (
          <button type="button" className="-mt-2 w-fit text-[13px] font-bold text-primary" onClick={enableCharged}>
            + I know exactly what this cost in {trip.baseCurrency}
          </button>
        ) : (
          <div className="-mt-2 rounded-xl border border-[oklch(0.9_0.01_250)] bg-[oklch(0.98_0.008_250)] p-4">
            <div className="mb-2.5 flex items-baseline justify-between">
              <span className="text-[13px] font-extrabold">Actually charged in {trip.baseCurrency}</span>
              <button type="button" className="text-xs font-semibold text-destructive" onClick={disableCharged}>Remove</button>
            </div>
            <MoneyInput aria-label={`Amount actually charged in ${trip.baseCurrency}`} placeholder={`e.g. ${displayScale(trip.baseCurrency) === 0 ? "840,000" : "840.00"}`} value={chargedAmount} onChange={setChargedAmount} />
            <p className="mt-2 text-xs text-muted-foreground">e.g. what your card statement actually shows — this becomes the exact rate used for this expense only, overriding the trip&apos;s saved rate.</p>
            <p className="mt-1 text-xs text-muted-foreground">{chargedHint}</p>
          </div>
        )}

        <PayerEditor amount={amount} currency={currency} rows={payers} participants={participants} onChange={setPayers} />
        <SplitEditor amount={amount} currency={currency} type={splitType} selected={selected} manual={manual} participants={participants} onType={splitTypeChanged} onSelected={setSelected} onManual={setManual} />
        <div className="space-y-1.5"><Label htmlFor="expense-note">Note</Label><Textarea id="expense-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></div>
      </div><DialogFooter className="mx-0 mt-4 mb-0 rounded-b-[20px] bg-muted/50 px-8 py-4"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button className="font-bold" disabled={!valid || pending} onClick={() => { onSubmit(expenseCreateSchema.parse(payload)); setOpen(false) }}>{pending ? <><Spinner className="mr-1.5" />Saving…</> : expense ? "Save changes" : "Save expense"}</Button></DialogFooter></TabsContent>
        {!expense ? <TabsContent value="receipt"><ReceiptWorkflow trip={trip} participants={participants} onConverted={() => { setOpen(false); onReceiptConverted?.() }} onManual={(defaults) => {
          setDescription(defaults.description)
          setDate(defaults.expenseDate)
          currencyChanged(defaults.currency)
          amountChanged(defaults.amount)
          setActiveTab("manual")
        }} /></TabsContent> : null}
      </Tabs>
    </DialogContent>
  </Dialog>
}
