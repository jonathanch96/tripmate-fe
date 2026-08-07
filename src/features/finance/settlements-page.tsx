"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, type FormEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import type { BalanceResult, Settlement, Transfer } from "@/features/finance/types"
import { useTrip } from "@/features/trip/trip-context"
import { apiFetch } from "@/lib/api-client"
import { ApiError } from "@/lib/envelope"
import { qk } from "@/lib/query-keys"

type Draft = { fromUserId: string; toUserId: string; amount: string; currency: string; method: "cash" | "bank_transfer"; note: string }

export function SettlementsPage() {
  const { trip, participants } = useTrip(), client = useQueryClient()
  const empty = { fromUserId: participants[0]?.userId ?? "", toUserId: participants[1]?.userId ?? "", amount: "", currency: trip.baseCurrency, method: "bank_transfer" as const, note: "" }
  const [draft, setDraft] = useState<Draft>(empty), [formError, setFormError] = useState("")
  const balances = useQuery({ queryKey: qk.balances(trip.code), queryFn: async () => (await apiFetch<BalanceResult>(`/api/trips/${trip.code}/balances`)).data! })
  const history = useQuery({ queryKey: qk.settlements(trip.code), queryFn: async () => (await apiFetch<Settlement[]>(`/api/trips/${trip.code}/settlements?per_page=100`)).data ?? [] })
  const refresh = async () => Promise.all([client.invalidateQueries({ queryKey: qk.balances(trip.code) }), client.invalidateQueries({ queryKey: qk.settlements(trip.code) }), client.invalidateQueries({ queryKey: qk.finalSettlement(trip.code) })])
  const create = useMutation({ mutationFn: () => apiFetch(`/api/trips/${trip.code}/settlements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) }), onSuccess: async () => { setFormError(""); setDraft(empty); await refresh() }, onError: (error) => { const code = error instanceof ApiError ? error.envelope.code : ""; setFormError(code === "SETTLEMENT_EXCEEDS_DEBT" ? error.message : code === "SETTLEMENT_NOT_ALLOWED_YET" ? "This trip does not allow settlements before its end date." : "The settlement could not be recorded.") } })
  const action = useMutation({ mutationFn: ({ row, action }: { row: Settlement; action: "approve" | "reject" | "delete" }) => apiFetch(`/api/trips/${trip.code}/settlements/${row.id}${action === "delete" ? "" : `/${action}`}`, { method: action === "delete" ? "DELETE" : "POST", headers: action === "reject" ? { "Content-Type": "application/json" } : undefined, body: action === "reject" ? JSON.stringify({ reason: "Rejected by planner" }) : undefined }), onSuccess: refresh })
  const names = new Map(participants.map((p) => [p.userId, p.user?.name ?? p.user?.email ?? "Participant"]))
  const recipient = participants.find((p) => p.userId === draft.toUserId)
  function prefill(debt: Transfer) { setDraft({ ...draft, fromUserId: debt.fromUserId, toUserId: debt.toUserId, amount: debt.amount, currency: debt.currency }); document.getElementById("record-settlement")?.scrollIntoView({ behavior: "smooth" }) }
  function submit(event: FormEvent) { event.preventDefault(); setFormError(""); create.mutate() }
  return <section className="space-y-6"><div><h2 className="text-xl font-semibold">Settlements</h2><p className="text-sm text-muted-foreground">Record transfers and track planner approval.</p></div>
    <Card><CardHeader><CardTitle>Outstanding debts</CardTitle></CardHeader><CardContent className="space-y-3">{balances.data?.debts.length ? balances.data.debts.map((debt, i) => <div key={i} className="flex flex-wrap items-center justify-between gap-2"><span>{names.get(debt.fromUserId)} owes {names.get(debt.toUserId)} <strong>{debt.currency} {debt.amount}</strong></span><Button size="sm" onClick={() => prefill(debt)}>Settle this</Button></div>) : <p className="text-muted-foreground">No outstanding debts.</p>}</CardContent></Card>
    <Card id="record-settlement"><CardHeader><CardTitle>Record a settlement</CardTitle></CardHeader><CardContent><form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
      <label className="space-y-1 text-sm">From<NativeSelect className="w-full" value={draft.fromUserId} onChange={(e) => setDraft({ ...draft, fromUserId: e.target.value })}>{participants.map((p) => <option key={p.userId} value={p.userId}>{names.get(p.userId)}</option>)}</NativeSelect></label>
      <label className="space-y-1 text-sm">To<NativeSelect className="w-full" value={draft.toUserId} onChange={(e) => setDraft({ ...draft, toUserId: e.target.value })}>{participants.map((p) => <option key={p.userId} value={p.userId}>{names.get(p.userId)}</option>)}</NativeSelect></label>
      <label className="space-y-1 text-sm">Amount<Input required inputMode="decimal" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></label>
      <label className="space-y-1 text-sm">Currency<Input required maxLength={3} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} /></label>
      <label className="space-y-1 text-sm">Method<NativeSelect className="w-full" value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value as Draft["method"] })}><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option></NativeSelect></label>
      <label className="space-y-1 text-sm">Note<Input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label>
      {draft.method === "bank_transfer" ? <div className="sm:col-span-2 rounded-lg bg-muted p-3 text-sm">Recipient account: {recipient?.bankInfo ? `${recipient.bankInfo.bankName} · ${recipient.bankInfo.accountNumber} · ${recipient.bankInfo.accountHolder}` : "No bank details saved"}</div> : null}
      {formError ? <p role="alert" className="sm:col-span-2 text-sm text-destructive">{formError}</p> : null}<Button className="sm:col-span-2" disabled={create.isPending} type="submit">{create.isPending ? "Recording…" : "Record settlement"}</Button>
    </form></CardContent></Card>
    <Card><CardHeader><CardTitle>History</CardTitle></CardHeader><CardContent className="space-y-3">{history.data?.length ? history.data.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0"><div><p>{row.fromUser?.name ?? names.get(row.fromUserId)} → {row.toUser?.name ?? names.get(row.toUserId)} · <strong>{row.currency} {row.amount}</strong></p><Badge variant="outline">{row.status}</Badge></div>{trip.canEditSettings && row.status === "pending" ? <div className="flex gap-2"><Button size="sm" onClick={() => action.mutate({ row, action: "approve" })}>Approve</Button><Button size="sm" variant="outline" onClick={() => action.mutate({ row, action: "reject" })}>Reject</Button><Button size="sm" variant="destructive" onClick={() => action.mutate({ row, action: "delete" })}>Delete</Button></div> : null}</div>) : <p className="text-muted-foreground">No settlements recorded.</p>}</CardContent></Card>
  </section>
}
