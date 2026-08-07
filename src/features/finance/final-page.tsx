"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MissingRateState } from "@/features/finance/missing-rate-state"
import type { FinalPlan, Rate } from "@/features/finance/types"
import { useTrip } from "@/features/trip/trip-context"
import { apiFetch } from "@/lib/api-client"
import { qk } from "@/lib/query-keys"

type RateDraft = { from: string; to: string; rate: string }

export function FinalPage() {
  const { trip, participants } = useTrip(), search = useSearchParams(), client = useQueryClient(), router = useRouter()
  const requested = useMemo(() => (search.get("pairs") ?? "").split(",").filter(Boolean), [search])
  const [newPair, setNewPair] = useState<RateDraft>(() => { const [from = "USD", to = trip.baseCurrency] = (requested[0] ?? "→").split("→"); return { from, to, rate: "" } })
  const rates = useQuery({ queryKey: qk.rates(trip.code), queryFn: async () => (await apiFetch<Rate[]>(`/api/trips/${trip.code}/exchange-rates`)).data ?? [] })
  const plan = useQuery({ queryKey: qk.finalSettlement(trip.code), queryFn: async () => (await apiFetch<FinalPlan>(`/api/trips/${trip.code}/final-settlement`)).data! })
  const refresh = async () => Promise.all([client.invalidateQueries({ queryKey: qk.rates(trip.code) }), client.invalidateQueries({ queryKey: qk.finalSettlement(trip.code) }), client.invalidateQueries({ queryKey: qk.balances(trip.code) })])
  const setRate = useMutation({ mutationFn: (draft: RateDraft) => apiFetch(`/api/trips/${trip.code}/exchange-rates`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) }), onSuccess: refresh })
  const finalize = useMutation({ mutationFn: (action: "finalize" | "unfinalize") => apiFetch(`/api/trips/${trip.code}/${action}`, { method: "POST" }), onSuccess: async () => { await refresh(); router.refresh() } })
  const names = new Map(participants.map((p) => [p.userId, p.user?.name ?? p.user?.email ?? "Participant"]))
  function confirmFinalize() { if (window.confirm("Finalizing locks the effective exchange rates, prevents expense and settlement changes, and snapshots this optimized transfer plan. Continue?")) finalize.mutate("finalize") }
  return <section className="space-y-6"><div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">Final settlement</h2><p className="text-sm text-muted-foreground">Lock rates and finish with the smallest practical transfer plan.</p></div>{trip.isFinalized ? <Badge>Finalized</Badge> : null}</div>
    <Card id="rates"><CardHeader><CardTitle>Exchange rates</CardTitle></CardHeader><CardContent className="space-y-3">{rates.data?.map((rate) => <div key={rate.id} className="flex justify-between"><span>{rate.from} → {rate.to}</span><span>{rate.rate} {rate.isFinal ? <Badge variant="outline">locked</Badge> : null}</span></div>)}
      {requested.filter((pair) => !rates.data?.some((rate) => `${rate.from}→${rate.to}` === pair)).map((pair) => <p key={pair} className="text-sm text-amber-700">Missing: {pair}</p>)}
      {trip.canEditSettings && !trip.isFinalized ? <form className="grid gap-2 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); setRate.mutate(newPair) }}><Input aria-label="From currency" maxLength={3} value={newPair.from} onChange={(e) => setNewPair({ ...newPair, from: e.target.value.toUpperCase() })} /><Input aria-label="To currency" maxLength={3} value={newPair.to} onChange={(e) => setNewPair({ ...newPair, to: e.target.value.toUpperCase() })} /><Input aria-label="Rate" required inputMode="decimal" placeholder="Rate" value={newPair.rate} onChange={(e) => setNewPair({ ...newPair, rate: e.target.value })} /><Button disabled={setRate.isPending} type="submit">Set & lock rate</Button></form> : null}
    </CardContent></Card>
    {plan.error ? <MissingRateState error={plan.error} tripCode={trip.code} /> : <Card><CardHeader><CardTitle>Optimized transfer plan</CardTitle></CardHeader><CardContent className="space-y-4">{plan.isLoading ? <p>Calculating plan…</p> : plan.data?.transfers.length ? plan.data.transfers.map((transfer, i) => <div key={i} className="rounded-lg border p-3"><div className="flex justify-between"><span>{names.get(transfer.fromUserId)} → {names.get(transfer.toUserId)}</span><strong>{transfer.currency} {transfer.amount}</strong></div>{transfer.bankAccountNumber ? <p className="mt-2 text-sm text-muted-foreground">{transfer.bankName} · {transfer.bankAccountNumber} · {transfer.bankAccountHolder}</p> : null}</div>) : <p className="text-muted-foreground">Everyone is settled up. No transfers are needed.</p>}</CardContent></Card>}
    {trip.canEditSettings ? <div className="flex justify-end">{trip.isFinalized ? <Button variant="outline" disabled={finalize.isPending} onClick={() => finalize.mutate("unfinalize")}>Unfinalize trip</Button> : <Button disabled={finalize.isPending || Boolean(plan.error)} onClick={confirmFinalize}>Finalize trip</Button>}</div> : null}
  </section>
}
