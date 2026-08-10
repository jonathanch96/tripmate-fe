"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, type FormEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
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
  const [recordOpen, setRecordOpen] = useState(false)
  // The rejection reason is required by the API, so the planner types a real one here.
  const [rejecting, setRejecting] = useState<Settlement | null>(null), [reason, setReason] = useState(""), [rejectError, setRejectError] = useState("")
  const [actionError, setActionError] = useState("")
  const balances = useQuery({ queryKey: qk.balances(trip.code), queryFn: async () => (await apiFetch<BalanceResult>(`/api/trips/${trip.code}/balances`)).data! })
  const history = useQuery({ queryKey: qk.settlements(trip.code), queryFn: async () => (await apiFetch<Settlement[]>(`/api/trips/${trip.code}/settlements?per_page=100`)).data ?? [] })
  const refresh = async () => Promise.all([client.invalidateQueries({ queryKey: qk.balances(trip.code) }), client.invalidateQueries({ queryKey: qk.settlements(trip.code) }), client.invalidateQueries({ queryKey: qk.finalSettlement(trip.code) })])
  const create = useMutation({
    mutationFn: () => apiFetch(`/api/trips/${trip.code}/settlements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) }),
    onSuccess: async () => { setFormError(""); setDraft(empty); setRecordOpen(false); await refresh() },
    // These two stay inline in the dialog rather than becoming toasts: they tell the user what to
    // change about this settlement, so they have to sit next to the fields.
    onError: (error) => { const code = error instanceof ApiError ? error.envelope.code : ""; setFormError(code === "SETTLEMENT_EXCEEDS_DEBT" ? error.message : code === "SETTLEMENT_NOT_ALLOWED_YET" ? "This trip does not allow settlements before its end date." : "The settlement could not be recorded.") },
  })
  const action = useMutation({
    mutationFn: ({ row, action, body }: { row: Settlement; action: "approve" | "reject" | "delete"; body?: { reason: string } }) => apiFetch(`/api/trips/${trip.code}/settlements/${row.id}${action === "delete" ? "" : `/${action}`}`, { method: action === "delete" ? "DELETE" : "POST", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }),
    onSuccess: async () => { setRejecting(null); setReason(""); setRejectError(""); setActionError(""); await refresh() },
    // An approve/reject/delete that fails must say so — otherwise the row simply stays put and the
    // planner has no idea the click did nothing.
    onError: (error) => { const message = error instanceof ApiError ? error.message : "The settlement could not be updated."; if (rejecting) setRejectError(message); else setActionError(message) },
  })
  const names = new Map(participants.map((p) => [p.userId, p.user?.name ?? p.user?.email ?? "Participant"]))
  const recipient = participants.find((p) => p.userId === draft.toUserId)
  function prefill(debt: Transfer) { setDraft({ ...draft, fromUserId: debt.fromUserId, toUserId: debt.toUserId, amount: debt.amount, currency: debt.currency }); setFormError(""); setRecordOpen(true) }
  function submit(event: FormEvent) { event.preventDefault(); setFormError(""); create.mutate() }
  function submitRejection(event: FormEvent) { event.preventDefault(); if (!rejecting || !reason.trim()) { setRejectError("Give a reason so the payer knows what to fix."); return } action.mutate({ row: rejecting, action: "reject", body: { reason: reason.trim() } }) }
  return <section className="space-y-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-heading text-xl font-semibold">Settlements</h2><p className="text-sm text-muted-foreground">Record transfers and track planner approval.</p></div>
    <Dialog open={recordOpen} onOpenChange={(open) => { setRecordOpen(open); if (!open) setFormError("") }}>
      <DialogTrigger render={<Button />}>Record a settlement</DialogTrigger>
      <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Record a settlement</DialogTitle><DialogDescription>Log a payment between two participants. The planner approves it if this trip requires approval.</DialogDescription></DialogHeader>
        <form className="grid gap-3 sm:grid-cols-2" method="post" onSubmit={submit}>
          <label className="space-y-1 text-sm">From<NativeSelect className="w-full" value={draft.fromUserId} onChange={(e) => setDraft({ ...draft, fromUserId: e.target.value })}>{participants.map((p) => <option key={p.userId} value={p.userId}>{names.get(p.userId)}</option>)}</NativeSelect></label>
          <label className="space-y-1 text-sm">To<NativeSelect className="w-full" value={draft.toUserId} onChange={(e) => setDraft({ ...draft, toUserId: e.target.value })}>{participants.map((p) => <option key={p.userId} value={p.userId}>{names.get(p.userId)}</option>)}</NativeSelect></label>
          <label className="space-y-1 text-sm">Amount<Input required inputMode="decimal" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></label>
          <label className="space-y-1 text-sm">Currency<Input required maxLength={3} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} /></label>
          <label className="space-y-1 text-sm">Method<NativeSelect className="w-full" value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value as Draft["method"] })}><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option></NativeSelect></label>
          <label className="space-y-1 text-sm">Note<Input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label>
          {draft.method === "bank_transfer" ? <div className="sm:col-span-2 rounded-lg bg-muted p-3 text-sm">Recipient account: {recipient?.bankInfo ? `${recipient.bankInfo.bankName} · ${recipient.bankInfo.accountNumber} · ${recipient.bankInfo.accountHolder}` : "No bank details saved"}</div> : null}
          {formError ? <p role="alert" className="sm:col-span-2 text-sm text-destructive">{formError}</p> : null}
          <DialogFooter className="sm:col-span-2"><Button disabled={create.isPending} type="submit">{create.isPending ? "Recording…" : "Record settlement"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
    <Card><CardHeader><CardTitle>Outstanding debts</CardTitle></CardHeader><CardContent className="space-y-3">{balances.data?.debts.length ? balances.data.debts.map((debt, i) => <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><span className="text-sm">{names.get(debt.fromUserId)} owes {names.get(debt.toUserId)} <strong className="text-destructive">{debt.currency} {debt.amount}</strong></span><Button size="sm" onClick={() => prefill(debt)}>Settle this</Button></div>) : <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">No outstanding debts.</div>}</CardContent></Card>
    <Card><CardHeader><CardTitle>History</CardTitle></CardHeader><CardContent className="space-y-3">{actionError ? <p role="alert" className="text-sm text-destructive">{actionError}</p> : null}{history.data?.length ? <Table>
      <TableHeader><TableRow><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
      <TableBody>{history.data.map((row) => <TableRow key={row.id}>
        <TableCell>{row.fromUser?.name ?? names.get(row.fromUserId)}</TableCell>
        <TableCell>{row.toUser?.name ?? names.get(row.toUserId)}</TableCell>
        <TableCell>{row.method === "bank_transfer" ? "Bank transfer" : "Cash"}</TableCell>
        <TableCell><Badge variant={row.status === "pending" ? "secondary" : row.status === "rejected" ? "destructive" : "outline"}>{row.status}</Badge></TableCell>
        <TableCell className="text-right font-medium tabular-nums">{row.currency} {row.amount}</TableCell>
        <TableCell>{trip.canEditSettings && row.status === "pending" ? <div className="flex gap-1"><Button size="sm" disabled={action.isPending} onClick={() => action.mutate({ row, action: "approve" })}>Approve</Button><Button size="sm" variant="outline" disabled={action.isPending} onClick={() => { setRejecting(row); setReason(""); setRejectError("") }}>Reject</Button><Button size="sm" variant="destructive" disabled={action.isPending} onClick={() => action.mutate({ row, action: "delete" })}>Delete</Button></div> : null}</TableCell>
      </TableRow>)}</TableBody>
    </Table> : <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">No settlements recorded.</div>}</CardContent></Card>
    <Dialog open={rejecting !== null} onOpenChange={(open) => { if (!open) { setRejecting(null); setRejectError("") } }}>
      <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Reject this settlement</DialogTitle><DialogDescription>{rejecting ? `${names.get(rejecting.fromUserId)} → ${names.get(rejecting.toUserId)} · ${rejecting.currency} ${rejecting.amount}` : ""}</DialogDescription></DialogHeader>
        <form className="space-y-3" method="post" onSubmit={submitRejection}>
          <label className="space-y-1 text-sm">Reason<Textarea required value={reason} onChange={(e) => { setReason(e.target.value); setRejectError("") }} placeholder="Tell the payer why this was rejected" /></label>
          {rejectError ? <p role="alert" className="text-sm text-destructive">{rejectError}</p> : null}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setRejecting(null)}>Cancel</Button><Button type="submit" variant="destructive" disabled={action.isPending}>{action.isPending ? "Rejecting…" : "Reject settlement"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </section>
}
