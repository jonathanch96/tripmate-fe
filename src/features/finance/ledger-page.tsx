"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { LoadingState } from "@/components/ui/spinner"
import { listExpenseCategories } from "@/features/expense/category-api"
import { MissingRateState } from "@/features/finance/missing-rate-state"
import type { Ledger, LedgerEntry } from "@/features/finance/types"
import { useTrip } from "@/features/trip/trip-context"
import { apiFetch } from "@/lib/api-client"
import { formatMoney, safeDecimal } from "@/lib/money"
import { participantName, participantNameMap } from "@/lib/participant-name"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

const GRID_COLS = "90px 2fr 130px 130px"

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

export function LedgerPage() {
  const { trip, participants } = useTrip()
  const names = participantNameMap(participants)
  const [memberId, setMemberId] = useState(participants[0]?.userId ?? "")
  const [againstId, setAgainstId] = useState("")
  const categories = useQuery({ queryKey: qk.expenseCategories(trip.code), queryFn: async () => (await listExpenseCategories(trip.code)).data ?? [] })
  const categoryName = (id?: string | null) => categories.data?.find((category) => category.id === id)?.name ?? "Other"

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
      </div>
    </div>

    {query.error ? <MissingRateState error={query.error} tripCode={trip.code} /> : query.isLoading || !query.data ? <LoadingState label="Loading ledger…" /> : <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2.5 rounded-[14px] border border-border bg-white p-5">
        <p className="text-[13px] font-bold text-muted-foreground">{againstId ? `Balance with ${counterpartyName}` : "Running balance"}</p>
        <p className={cn("text-[20px] font-extrabold", balanceColor(query.data.netBalance))}>{balanceLabel(query.data.netBalance, query.data.baseCurrency)}</p>
      </div>
      {query.data.entries.length ? (
        <div className="overflow-hidden rounded-[14px] border border-border bg-white">
          <div className="grid gap-3 border-b bg-muted px-5 py-3 text-[11px] font-bold tracking-wide text-muted-foreground uppercase" style={{ gridTemplateColumns: GRID_COLS }}>
            <span>Date</span><span>Description</span><span className="text-right">Amount</span><span className="text-right">Balance</span>
          </div>
          {query.data.entries.map((entry, index) => {
            const delta = safeDecimal(entry.delta)
            return (
              <div key={index} className="grid items-center gap-3 border-b border-[oklch(0.95_0.006_60)] px-5 py-3.5 last:border-0" style={{ gridTemplateColumns: GRID_COLS }}>
                <span className="text-[13px] text-muted-foreground">{entry.date}</span>
                <div>
                  <p className="text-sm font-semibold">{entryTitle(entry, names)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{entryDetail(entry, query.data!.baseCurrency, categoryName, !!againstId, counterpartyName)}</p>
                </div>
                <span className={cn("text-right text-sm font-bold tabular-nums", delta.isNegative() ? "text-destructive" : "text-success")}>
                  {`${delta.isNegative() ? "-" : "+"}${formatMoney(delta.abs(), query.data.baseCurrency)}`}
                </span>
                <span className="text-right text-[13px] text-muted-foreground tabular-nums">{formatMoney(entry.runningBalance, query.data.baseCurrency)}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border-[1.5px] border-dashed border-border px-6 py-16 text-center">
          <p className="mb-1.5 text-[15px] font-bold">No transactions yet</p>
          <p className="text-[13px] text-muted-foreground">Expenses and settlements involving this person will show up here.</p>
        </div>
      )}
    </>}
  </section>
}
