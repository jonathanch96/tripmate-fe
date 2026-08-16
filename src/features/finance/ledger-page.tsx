"use client"

import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type Decimal from "decimal.js"
import { useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { LoadingState } from "@/components/ui/spinner"
import { listExpenseCategories } from "@/features/expense/category-api"
import { MissingRateState } from "@/features/finance/missing-rate-state"
import { convertFromBase, otherTripCurrencies } from "@/features/finance/rate-pair-helpers"
import type { Ledger, LedgerEntry, Rate } from "@/features/finance/types"
import { useTrip } from "@/features/trip/trip-context"
import { apiFetch } from "@/lib/api-client"
import { formatMoney, safeDecimal } from "@/lib/money"
import { participantName, participantNameMap } from "@/lib/participant-name"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

const GRID_COLS = "90px 2fr 130px 130px"

type SignFilter = "all" | "positive" | "negative"

export function balanceLabel(net: string, currency: string) {
  const value = safeDecimal(net)
  if (value.greaterThan("0.5")) return `Owed ${formatMoney(value, currency)}`
  if (value.lessThan("-0.5")) return `Owes ${formatMoney(value.abs(), currency)}`
  return "Settled up"
}

export function balanceColor(net: string) {
  const value = safeDecimal(net)
  if (value.greaterThan("0.5")) return "text-success"
  if (value.lessThan("-0.5")) return "text-destructive"
  return "text-muted-foreground"
}

export function entryTitle(entry: LedgerEntry, names: Map<string, string>) {
  if (entry.kind === "expense") return entry.description
  const counterparty = (entry.counterpartyUserId && names.get(entry.counterpartyUserId)) || "them"
  return safeDecimal(entry.delta).isNegative() ? `Settlement from ${counterparty}` : `Settlement to ${counterparty}`
}

export function entryDetail(entry: LedgerEntry, currency: string, categoryName: (id?: string | null) => string, filtering: boolean, counterpartyName: string) {
  if (entry.kind === "settlement") return safeDecimal(entry.delta).isNegative() ? "You received" : "You paid"
  if (filtering) {
    return `${categoryName(entry.categoryId)} · ${safeDecimal(entry.delta).isPositive() ? `${counterpartyName}'s share of this expense` : `Your share, paid by ${counterpartyName}`}`
  }
  const paid = safeDecimal(entry.paid)
  const share = safeDecimal(entry.share)
  const summary = paid.greaterThan("0.005") && share.greaterThan("0.005")
    ? `Paid ${formatMoney(paid, currency)} · share ${formatMoney(share, currency)}`
    : paid.greaterThan("0.005") ? "Paid this expense" : "Your share"
  return `${categoryName(entry.categoryId)} · ${summary}`
}

export function matchesSign(entry: LedgerEntry, sign: SignFilter): boolean {
  if (sign === "all") return true
  const delta = safeDecimal(entry.delta)
  return sign === "positive" ? delta.isPositive() : delta.isNegative()
}

export function LedgerPage() {
  const { trip, participants } = useTrip()
  const { data: session, status: sessionStatus } = useSession()
  const names = participantNameMap(participants)
  const [memberId, setMemberId] = useState("")
  const [againstId, setAgainstId] = useState("")
  const defaultedMember = useRef(false)
  useEffect(() => {
    if (defaultedMember.current || sessionStatus === "loading") return
    const mine = participants.find((participant) => participant.userId === session?.user?.id)
    setMemberId(mine?.userId ?? participants[0]?.userId ?? "")
    defaultedMember.current = true
  }, [sessionStatus, session, participants])
  const [secondaryCurrency, setSecondaryCurrency] = useState("")
  const [sign, setSign] = useState<SignFilter>("all")
  const categories = useQuery({ queryKey: qk.expenseCategories(trip.code), queryFn: async () => (await listExpenseCategories(trip.code)).data ?? [] })
  const categoryName = (id?: string | null) => categories.data?.find((category) => category.id === id)?.name ?? "Other"
  const rates = useQuery({ queryKey: qk.rates(trip.code), queryFn: async () => (await apiFetch<Rate[]>(`/api/trips/${trip.code}/exchange-rates`)).data ?? [] })
  const secondaryOptions = rates.data ? otherTripCurrencies(trip.baseCurrency, rates.data) : []
  function secondaryLabel(amount: Decimal.Value) {
    if (!secondaryCurrency || !rates.data) return null
    const converted = convertFromBase(amount, trip.baseCurrency, secondaryCurrency, rates.data)
    return converted ? `≈ ${formatMoney(converted, secondaryCurrency)}` : null
  }

  const params = new URLSearchParams({ member_user_id: memberId })
  if (againstId) params.set("against_user_id", againstId)
  const query = useQuery({
    queryKey: [...qk.ledger(trip.code), memberId, againstId],
    queryFn: async () => (await apiFetch<Ledger>(`/api/trips/${trip.code}/ledger?${params}`)).data!,
    enabled: !!memberId,
  })

  function memberChanged(value: string) { setMemberId(value); setAgainstId("") }
  const againstOptions = participants.filter((participant) => participant.userId !== memberId)
  const counterpartyName = (againstId && names.get(againstId)) || "them"
  const visibleEntries = query.data?.entries.filter((entry) => matchesSign(entry, sign)) ?? []

  return <section>
    <div className="mb-[22px] flex flex-wrap items-end justify-between gap-3.5">
      <div>
        <h1 className="font-heading text-[26px] font-extrabold">Ledger</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Every transaction for one person, like a bank statement.</p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <NativeSelect aria-label="Member" value={memberId} onChange={(event) => memberChanged(event.target.value)} className="font-semibold">
          {participants.map((participant) => <NativeSelectOption key={participant.userId} value={participant.userId}>{participantName(participant)}</NativeSelectOption>)}
        </NativeSelect>
        <NativeSelect aria-label="Against" value={againstId} onChange={(event) => setAgainstId(event.target.value)}>
          <NativeSelectOption value="">Against: everyone</NativeSelectOption>
          {againstOptions.map((participant) => <NativeSelectOption key={participant.userId} value={participant.userId}>Against: {participantName(participant)}</NativeSelectOption>)}
        </NativeSelect>
        {secondaryOptions.length > 0 ? (
          <NativeSelect aria-label="Show a secondary currency" value={secondaryCurrency} onChange={(event) => setSecondaryCurrency(event.target.value)}>
            <NativeSelectOption value="">Show in {trip.baseCurrency} only</NativeSelectOption>
            {secondaryOptions.map((option) => <NativeSelectOption key={option.code} value={option.code}>Also show in {option.code}</NativeSelectOption>)}
          </NativeSelect>
        ) : null}
      </div>
    </div>

    <div className="mb-5 flex gap-2">
      <Button type="button" variant={sign === "all" ? "default" : "outline"} size="sm" onClick={() => setSign("all")}>All</Button>
      <Button type="button" variant={sign === "positive" ? "default" : "outline"} size="sm" onClick={() => setSign("positive")}>+ Owed to you</Button>
      <Button type="button" variant={sign === "negative" ? "default" : "outline"} size="sm" onClick={() => setSign("negative")}>− You owe</Button>
    </div>

    {query.error ? <MissingRateState error={query.error} tripCode={trip.code} /> : query.isLoading || !query.data ? <LoadingState label="Loading ledger…" /> : <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2.5 rounded-[14px] border border-border bg-white p-5">
        <p className="text-[13px] font-bold text-muted-foreground">{againstId ? `Balance with ${counterpartyName}` : "Running balance"}</p>
        <div className="text-right">
          <p className={cn("text-[20px] font-extrabold", balanceColor(query.data.netBalance))}>{balanceLabel(query.data.netBalance, query.data.baseCurrency)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{secondaryLabel(safeDecimal(query.data.netBalance).abs())}</p>
        </div>
      </div>
      {visibleEntries.length ? (
        <div className="overflow-hidden rounded-[14px] border border-border bg-white">
          <div className="grid gap-3 border-b bg-muted px-5 py-3 text-[11px] font-bold tracking-wide text-muted-foreground uppercase" style={{ gridTemplateColumns: GRID_COLS }}>
            <span>Date</span><span>Description</span><span className="text-right">Amount</span><span className="text-right">Balance</span>
          </div>
          {visibleEntries.map((entry, index) => {
            const delta = safeDecimal(entry.delta)
            return (
              <div key={index} className="grid items-center gap-3 border-b border-[oklch(0.95_0.006_60)] px-5 py-3.5 last:border-0" style={{ gridTemplateColumns: GRID_COLS }}>
                <span className="text-[13px] text-muted-foreground">{entry.date}</span>
                <div>
                  <p className="text-sm font-semibold">{entryTitle(entry, names)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{entryDetail(entry, query.data!.baseCurrency, categoryName, !!againstId, counterpartyName)}</p>
                </div>
                <div className="text-right">
                  <span className={cn("text-sm font-bold tabular-nums", delta.isNegative() ? "text-destructive" : "text-success")}>
                    {`${delta.isNegative() ? "-" : "+"}${formatMoney(delta.abs(), query.data.baseCurrency)}`}
                  </span>
                  <p className="mt-0.5 text-xs text-muted-foreground">{secondaryLabel(delta.abs())}</p>
                </div>
                <span className="text-right text-[13px] text-muted-foreground tabular-nums">{formatMoney(entry.runningBalance, query.data.baseCurrency)}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border-[1.5px] border-dashed border-border px-6 py-16 text-center">
          <p className="mb-1.5 text-[15px] font-bold">{query.data.entries.length ? "No matching transactions" : "No transactions yet"}</p>
          <p className="text-[13px] text-muted-foreground">{query.data.entries.length ? "Try a different filter." : "Expenses and settlements involving this person will show up here."}</p>
        </div>
      )}
    </>}
  </section>
}
