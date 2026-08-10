"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { opposingRate, parsePair, type RateDraft } from "@/features/finance/exchange-rate-manager"
import { MissingRateState } from "@/features/finance/missing-rate-state"
import type { FinalPlan, Rate } from "@/features/finance/types"
import { useTrip } from "@/features/trip/trip-context"
import { apiFetch } from "@/lib/api-client"
import { qk } from "@/lib/query-keys"

export function FinalPage() {
  const { trip, participants } = useTrip(), search = useSearchParams(), client = useQueryClient(), router = useRouter()
  const requested = useMemo(() => (search.get("pairs") ?? "").split(",").filter(Boolean), [search])
  // Every missing pair gets its own input row, not just the first one.
  const [drafts, setDrafts] = useState<RateDraft[]>(() => (requested.length ? requested.map((pair) => parsePair(pair, trip.baseCurrency)) : [{ from: "USD", to: trip.baseCurrency, rate: "" }]))
  // AlertDialogAction is a plain button — it does not dismiss the dialog on its own, so the open
  // state is controlled here and closed explicitly once the planner confirms.
  const [confirmOpen, setConfirmOpen] = useState(false)
  const rates = useQuery({ queryKey: qk.rates(trip.code), queryFn: async () => (await apiFetch<Rate[]>(`/api/trips/${trip.code}/exchange-rates`)).data ?? [] })
  const plan = useQuery({ queryKey: qk.finalSettlement(trip.code), queryFn: async () => (await apiFetch<FinalPlan>(`/api/trips/${trip.code}/final-settlement`)).data! })
  const refresh = async () => Promise.all([client.invalidateQueries({ queryKey: qk.rates(trip.code) }), client.invalidateQueries({ queryKey: qk.finalSettlement(trip.code) }), client.invalidateQueries({ queryKey: qk.balances(trip.code) })])
  const setRate = useMutation({ mutationFn: (draft: RateDraft) => apiFetch(`/api/trips/${trip.code}/exchange-rates`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) }), onSuccess: refresh })
  const finalize = useMutation({ mutationFn: (action: "finalize" | "unfinalize") => apiFetch(`/api/trips/${trip.code}/${action}`, { method: "POST" }), onSuccess: async () => { await refresh(); router.refresh() } })
  const names = new Map(participants.map((p) => [p.userId, p.user?.name ?? p.user?.email ?? "Participant"]))
  const update = (index: number, patch: Partial<RateDraft>) => setDrafts(drafts.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)))
  const stillMissing = requested.filter((pair) => !rates.data?.some((rate) => `${rate.from}→${rate.to}` === pair))
  return <section className="space-y-6"><div className="flex items-center justify-between"><div><h2 className="font-heading text-xl font-semibold">Final settlement</h2><p className="text-sm text-muted-foreground">Lock rates and finish with the smallest practical transfer plan.</p></div>{trip.isFinalized ? <Badge>Finalized</Badge> : null}</div>
    <Card id="rates"><CardHeader><CardTitle>Exchange rates</CardTitle></CardHeader><CardContent className="space-y-3">{rates.data?.map((rate) => <div key={rate.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm"><span>{rate.from} → {rate.to}</span><span className="flex items-center gap-2 tabular-nums">{rate.rate} {rate.isFinal ? <Badge variant="outline">locked</Badge> : null}</span></div>)}
      {stillMissing.map((pair) => <p key={pair} className="text-sm text-amber-700 dark:text-amber-400">Missing: {pair}</p>)}
      {trip.canEditSettings && !trip.isFinalized ? <div className="space-y-2">{drafts.map((draft, index) => <div key={index} className="space-y-1"><form className="grid gap-2 sm:grid-cols-4" method="post" onSubmit={(e) => { e.preventDefault(); setRate.mutate(draft) }}>
        <Input aria-label={`From currency ${index + 1}`} maxLength={3} value={draft.from} onChange={(e) => update(index, { from: e.target.value.toUpperCase() })} />
        <Input aria-label={`To currency ${index + 1}`} maxLength={3} value={draft.to} onChange={(e) => update(index, { to: e.target.value.toUpperCase() })} />
        <Input aria-label={`Rate ${index + 1}`} required inputMode="decimal" placeholder="Rate" value={draft.rate} onChange={(e) => update(index, { rate: e.target.value })} />
        <Button disabled={setRate.isPending} type="submit">Set &amp; lock rate</Button>
      </form>
        {/* A pair holds one direction only; the server drops the opposite row on save. */}
        {opposingRate(rates.data, draft) ? <p className="text-sm text-muted-foreground">Saving this replaces the stored {draft.to} → {draft.from} rate — a pair is held in one direction only.</p> : null}
      </div>)}
        <Button size="sm" variant="outline" type="button" onClick={() => setDrafts([...drafts, { from: "", to: trip.baseCurrency, rate: "" }])}>+ Add another pair</Button>
      </div> : null}
    </CardContent></Card>
    {plan.error ? <MissingRateState error={plan.error} tripCode={trip.code} /> : <Card><CardHeader><CardTitle>Optimized transfer plan</CardTitle></CardHeader><CardContent className="space-y-4">{plan.isLoading ? <p className="text-muted-foreground">Calculating plan…</p> : plan.data?.transfers.length ? plan.data.transfers.map((transfer, i) => <div key={i} className="rounded-lg border p-3"><div className="flex justify-between text-sm"><span>{names.get(transfer.fromUserId)} → {names.get(transfer.toUserId)}</span><strong className="tabular-nums">{transfer.currency} {transfer.amount}</strong></div>{transfer.bankAccountNumber ? <p className="mt-2 text-sm text-muted-foreground">{transfer.bankName} · {transfer.bankAccountNumber} · {transfer.bankAccountHolder}</p> : null}</div>) : <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">Everyone is settled up. No transfers are needed.</div>}</CardContent></Card>}
    {trip.canEditSettings ? <div className="flex justify-end">{trip.isFinalized ? <Button variant="outline" disabled={finalize.isPending} onClick={() => finalize.mutate("unfinalize")}>Unfinalize trip</Button> : <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogTrigger render={<Button />} disabled={finalize.isPending || Boolean(plan.error)}>Finalize trip</AlertDialogTrigger>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Finalize this trip?</AlertDialogTitle><AlertDialogDescription>Finalizing locks the effective exchange rates, prevents further expense and settlement changes, and snapshots this optimized transfer plan. A planner can reopen the trip later, but the locked rates stay locked.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { setConfirmOpen(false); finalize.mutate("finalize") }}>Finalize trip</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>}</div> : null}
  </section>
}
