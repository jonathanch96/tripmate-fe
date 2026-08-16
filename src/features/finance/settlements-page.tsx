"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, type FormEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { MoneyInput } from "@/components/ui/money-input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { LoadingState, Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { otherTripCurrencies } from "@/features/finance/rate-pair-helpers"
import type { BalanceResult, Rate, Settlement, Transfer } from "@/features/finance/types"
import { useTrip } from "@/features/trip/trip-context"
import { apiFetch } from "@/lib/api-client"
import { ApiError } from "@/lib/envelope"
import { formatMoney } from "@/lib/money"
import { participantNameMap } from "@/lib/participant-name"
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
  const rates = useQuery({ queryKey: qk.rates(trip.code), queryFn: async () => (await apiFetch<Rate[]>(`/api/trips/${trip.code}/exchange-rates`)).data ?? [] })
  const currencyOptions = [trip.baseCurrency, ...otherTripCurrencies(trip.baseCurrency, rates.data ?? []).map((row) => row.code)]
  const refresh = async () => Promise.all([client.invalidateQueries({ queryKey: qk.balances(trip.code) }), client.invalidateQueries({ queryKey: qk.settlements(trip.code) }), client.invalidateQueries({ queryKey: qk.finalSettlement(trip.code) })])
  const create = useMutation({
    mutationFn: () => apiFetch(`/api/trips/${trip.code}/settlements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) }),
    onSuccess: async () => { setFormError(""); setDraft(empty); setRecordOpen(false); await refresh() },
    // This stays inline in the dialog rather than becoming a toast: it tells the user what to
    // change about this settlement, so it has to sit next to the fields.
    onError: (error) => { const code = error instanceof ApiError ? error.envelope.code : ""; setFormError(code === "SETTLEMENT_NOT_ALLOWED_YET" ? "This trip does not allow settlements before its end date." : "The settlement could not be recorded.") },
  })
  const action = useMutation({
    mutationFn: ({ row, action, body }: { row: Settlement; action: "approve" | "reject" | "delete"; body?: { reason: string } }) => apiFetch(`/api/trips/${trip.code}/settlements/${row.id}${action === "delete" ? "" : `/${action}`}`, { method: action === "delete" ? "DELETE" : "POST", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }),
    onSuccess: async () => { setRejecting(null); setReason(""); setRejectError(""); setActionError(""); await refresh() },
    // An approve/reject/delete that fails must say so — otherwise the row simply stays put and the
    // planner has no idea the click did nothing.
    onError: (error) => { const message = error instanceof ApiError ? error.message : "The settlement could not be updated."; if (rejecting) setRejectError(message); else setActionError(message) },
  })
  const names = participantNameMap(participants)
  const recipient = participants.find((p) => p.userId === draft.toUserId)
  function prefill(debt: Transfer) { setDraft({ ...draft, fromUserId: debt.fromUserId, toUserId: debt.toUserId, amount: debt.amount, currency: debt.currency }); setFormError(""); setRecordOpen(true) }
  function submit(event: FormEvent) { event.preventDefault(); setFormError(""); create.mutate() }
  function submitRejection(event: FormEvent) { event.preventDefault(); if (!rejecting || !reason.trim()) { setRejectError("Give a reason so the payer knows what to fix."); return } action.mutate({ row: rejecting, action: "reject", body: { reason: reason.trim() } }) }
  return <section>
    <div className="mb-[22px] flex items-end justify-between gap-3">
      <div><h1 className="font-heading text-[26px] font-extrabold">Settlements</h1><p className="mt-1.5 text-sm text-muted-foreground">Record a payment between members to update balances.</p></div>
      <Dialog open={recordOpen} onOpenChange={(open) => { setRecordOpen(open); if (!open) setFormError("") }}>
        <DialogTrigger render={<Button className="font-bold">+ Record settlement</Button>} />
        <DialogContent className="rounded-[20px] sm:max-w-lg"><DialogHeader><DialogTitle className="font-heading text-[19px] font-extrabold">Record settlement</DialogTitle><DialogDescription>Log a payment between two participants. The planner approves it if this trip requires approval.</DialogDescription></DialogHeader>
          <form className="grid gap-3 sm:grid-cols-2" method="post" onSubmit={submit}>
            <label className="space-y-1.5 text-sm font-semibold">From (who is paying)<NativeSelect className="w-full font-normal" value={draft.fromUserId} onChange={(e) => setDraft({ ...draft, fromUserId: e.target.value })}>{participants.map((p) => <NativeSelectOption key={p.userId} value={p.userId}>{names.get(p.userId)}</NativeSelectOption>)}</NativeSelect></label>
            <label className="space-y-1.5 text-sm font-semibold">To (who receives it)<NativeSelect className="w-full font-normal" value={draft.toUserId} onChange={(e) => setDraft({ ...draft, toUserId: e.target.value })}>{participants.map((p) => <NativeSelectOption key={p.userId} value={p.userId}>{names.get(p.userId)}</NativeSelectOption>)}</NativeSelect></label>
            <label className="space-y-1.5 text-sm font-semibold">Amount<MoneyInput required placeholder="0.00" value={draft.amount} onChange={(value) => setDraft({ ...draft, amount: value })} /></label>
            <label className="space-y-1.5 text-sm font-semibold">Currency<NativeSelect className="w-full font-normal" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}>{currencyOptions.map((code) => <NativeSelectOption key={code} value={code}>{code}</NativeSelectOption>)}</NativeSelect></label>
            <label className="space-y-1.5 text-sm font-semibold">Method<NativeSelect className="w-full font-normal" value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value as Draft["method"] })}><NativeSelectOption value="bank_transfer">Bank transfer</NativeSelectOption><NativeSelectOption value="cash">Cash</NativeSelectOption></NativeSelect></label>
            <label className="space-y-1.5 text-sm font-semibold">Note<Input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label>
            {draft.method === "bank_transfer" ? <div className="rounded-lg bg-muted p-3 text-sm sm:col-span-2">Recipient account: {recipient?.bankInfo ? `${recipient.bankInfo.bankName} · ${recipient.bankInfo.accountNumber} · ${recipient.bankInfo.accountHolder}` : "No bank details saved"}</div> : null}
            {formError ? <p role="alert" className="text-sm text-destructive sm:col-span-2">{formError}</p> : null}
            <DialogFooter className="sm:col-span-2"><Button variant="outline" type="button" onClick={() => setRecordOpen(false)}>Cancel</Button><Button className="font-bold" disabled={create.isPending} type="submit">{create.isPending ? <><Spinner className="mr-1.5" />Recording…</> : "Save settlement"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>

    <h3 className="mb-3.5 font-heading text-[15px] font-extrabold">Outstanding debts</h3>
    <div className="mb-8">
      {balances.isLoading ? <LoadingState label="Loading debts…" /> : balances.data?.debts.length ? (
        <div className="rounded-[14px] border border-border bg-white px-5">
          {balances.data.debts.map((debt, i) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-[oklch(0.95_0.006_60)] py-3.5 last:border-0">
              <span className="text-sm">{names.get(debt.fromUserId)} owes {names.get(debt.toUserId)} <strong className="text-destructive">{formatMoney(debt.amount, debt.currency)}</strong></span>
              <Button size="sm" className="font-bold" onClick={() => prefill(debt)}>Settle this</Button>
            </div>
          ))}
        </div>
      ) : <div className="rounded-2xl border-[1.5px] border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">No outstanding debts.</div>}
    </div>

    <h3 className="mb-3.5 font-heading text-[15px] font-extrabold">History</h3>
    {actionError ? <p role="alert" className="mb-2 text-sm text-destructive">{actionError}</p> : null}
    {history.isLoading ? <LoadingState label="Loading settlements…" /> : history.data?.length ? (
      <div className="overflow-hidden rounded-[14px] border border-border bg-white">
        <Table>
          <TableHeader><TableRow className="border-b-border bg-muted hover:bg-muted">
            <TableHead className="h-auto py-3 pl-5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">From</TableHead>
            <TableHead className="h-auto py-3 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">To</TableHead>
            <TableHead className="h-auto py-3 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Method</TableHead>
            <TableHead className="h-auto py-3 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Status</TableHead>
            <TableHead className="h-auto py-3 text-right text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Amount</TableHead>
            <TableHead className="h-auto py-3 pr-5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>{history.data.map((row) => <TableRow key={row.id} className="border-b-[oklch(0.95_0.006_60)]">
            <TableCell className="py-4 pl-5 text-sm">{names.get(row.fromUserId) ?? row.fromUser?.name ?? "Participant"}</TableCell>
            <TableCell className="py-4 text-sm">{names.get(row.toUserId) ?? row.toUser?.name ?? "Participant"}</TableCell>
            <TableCell className="py-4 text-sm text-muted-foreground">{row.method === "bank_transfer" ? "Bank transfer" : "Cash"}</TableCell>
            <TableCell className="py-4"><Badge variant={row.status === "pending" ? "secondary" : row.status === "rejected" ? "destructive" : "outline"}>{row.status}</Badge></TableCell>
            <TableCell className="py-4 text-right text-sm font-bold tabular-nums">{formatMoney(row.amount, row.currency)}</TableCell>
            <TableCell className="py-4 pr-5">{trip.canEditSettings && row.status === "pending" ? <div className="flex justify-end gap-2"><Button size="sm" className="h-auto rounded-[7px] px-2.5 py-1 text-xs font-semibold" disabled={action.isPending} onClick={() => action.mutate({ row, action: "approve" })}>{action.isPending ? <Spinner /> : "Approve"}</Button><Button size="sm" variant="outline" className="h-auto rounded-[7px] px-2.5 py-1 text-xs font-semibold" disabled={action.isPending} onClick={() => { setRejecting(row); setReason(""); setRejectError("") }}>Reject</Button><Button size="sm" variant="ghost" className="h-auto px-2 py-1 text-xs font-semibold text-destructive hover:text-destructive" disabled={action.isPending} onClick={() => action.mutate({ row, action: "delete" })}>{action.isPending ? <Spinner /> : "Delete"}</Button></div> : null}</TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </div>
    ) : <div className="rounded-2xl border-[1.5px] border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">No settlements yet. Once someone pays back, record it here.</div>}

    <Dialog open={rejecting !== null} onOpenChange={(open) => { if (!open) { setRejecting(null); setRejectError("") } }}>
      <DialogContent className="rounded-[20px] sm:max-w-md"><DialogHeader><DialogTitle className="font-heading text-[19px] font-extrabold">Reject this settlement</DialogTitle><DialogDescription>{rejecting ? `${names.get(rejecting.fromUserId)} → ${names.get(rejecting.toUserId)} · ${formatMoney(rejecting.amount, rejecting.currency)}` : ""}</DialogDescription></DialogHeader>
        <form className="space-y-3" method="post" onSubmit={submitRejection}>
          <label className="space-y-1.5 text-sm font-semibold">Reason<Textarea required value={reason} onChange={(e) => { setReason(e.target.value); setRejectError("") }} placeholder="Tell the payer why this was rejected" /></label>
          {rejectError ? <p role="alert" className="text-sm text-destructive">{rejectError}</p> : null}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setRejecting(null)}>Cancel</Button><Button type="submit" variant="destructive" className="font-bold" disabled={action.isPending}>{action.isPending ? <><Spinner className="mr-1.5" />Rejecting…</> : "Reject settlement"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </section>
}
