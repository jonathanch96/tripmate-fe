"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Rate } from "@/features/finance/types"
import { apiFetch } from "@/lib/api-client"
import { qk } from "@/lib/query-keys"

export type RateDraft = { from: string; to: string; rate: string }

export const parsePair = (pair: string, fallbackTo: string): RateDraft => {
  const [from = "", to = ""] = pair.split("→")
  return { from: from.toUpperCase(), to: (to || fallbackTo).toUpperCase(), rate: "" }
}

export const normalizeCode = (code: string) => code.trim().toUpperCase()

// A currency pair is stored in one direction only — the backend retires the opposite row when a
// rate is saved. This finds the row that a draft is about to replace, so the planner is told first.
export function opposingRate(rates: Rate[] | undefined, draft: Pick<RateDraft, "from" | "to">) {
  const from = normalizeCode(draft.from), to = normalizeCode(draft.to)
  if (!from || !to || from === to) return undefined
  return rates?.find((rate) => normalizeCode(rate.from) === to && normalizeCode(rate.to) === from)
}

// Shared between the trip Settings > Currencies page and the Final plan page, which additionally
// shows missing-pair warnings and rate-locking tied to finalization - that stays in final-page.tsx.
export function ExchangeRateManager({ tripCode, baseCurrency, canEdit }: { tripCode: string; baseCurrency: string; canEdit: boolean }) {
  const client = useQueryClient()
  const rates = useQuery({ queryKey: qk.rates(tripCode), queryFn: async () => (await apiFetch<Rate[]>(`/api/trips/${tripCode}/exchange-rates`)).data ?? [] })
  const [drafts, setDrafts] = useState<RateDraft[]>([{ from: "", to: baseCurrency, rate: "" }])
  const setRate = useMutation({
    mutationFn: (draft: RateDraft) => apiFetch(`/api/trips/${tripCode}/exchange-rates`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) }),
    onSuccess: async () => { setDrafts([{ from: "", to: baseCurrency, rate: "" }]); await client.invalidateQueries({ queryKey: qk.rates(tripCode) }) },
  })
  const update = (index: number, patch: Partial<RateDraft>) => setDrafts(drafts.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)))

  return (
    <div className="space-y-3">
      {rates.data?.length ? rates.data.map((rate) => (
        <div key={rate.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
          <span>{rate.from} → {rate.to}</span>
          <span className="flex items-center gap-2 tabular-nums">{rate.rate} {rate.isFinal ? <Badge variant="outline">locked</Badge> : null}</span>
        </div>
      )) : <p className="text-sm text-muted-foreground">No exchange rates recorded yet.</p>}
      {canEdit ? (
        <div className="space-y-2 pt-1">
          {drafts.map((draft, index) => (
            <div key={index} className="space-y-1">
              <form className="grid gap-2 sm:grid-cols-4" method="post" onSubmit={(event) => { event.preventDefault(); setRate.mutate(draft) }}>
                <Input aria-label={`From currency ${index + 1}`} maxLength={3} placeholder="From" value={draft.from} onChange={(event) => update(index, { from: event.target.value.toUpperCase() })} />
                <Input aria-label={`To currency ${index + 1}`} maxLength={3} placeholder="To" value={draft.to} onChange={(event) => update(index, { to: event.target.value.toUpperCase() })} />
                <Input aria-label={`Rate ${index + 1}`} required inputMode="decimal" placeholder="Rate" value={draft.rate} onChange={(event) => update(index, { rate: event.target.value })} />
                <Button disabled={setRate.isPending} type="submit" size="sm">Set &amp; lock rate</Button>
              </form>
              {opposingRate(rates.data, draft) ? <p className="text-xs text-muted-foreground">Saving this replaces the stored {draft.to} → {draft.from} rate — a pair is held in one direction only.</p> : null}
            </div>
          ))}
          <Button size="sm" variant="outline" type="button" onClick={() => setDrafts([...drafts, { from: "", to: baseCurrency, rate: "" }])}>+ Add another pair</Button>
        </div>
      ) : null}
    </div>
  )
}
