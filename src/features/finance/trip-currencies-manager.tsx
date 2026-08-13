"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { LoadingState, Spinner } from "@/components/ui/spinner"
import type { Rate } from "@/features/finance/types"
import { apiFetch } from "@/lib/api-client"
import { ApiError } from "@/lib/envelope"
import { SUPPORTED_CURRENCIES } from "@/lib/currencies"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

type CurrencyRow = { code: string; isBase: boolean; rateLabel: string; rate?: Rate }

// The trip's "currencies" are the base plus whatever currencies have a rate stored directly
// against it - there is no separate currency-list table, this is just how the mockup's simpler
// mental model maps onto the backend's from/to rate rows.
function deriveRows(baseCurrency: string, rates: Rate[]): CurrencyRow[] {
  const rows: CurrencyRow[] = [{ code: baseCurrency, isBase: true, rateLabel: "Base currency" }]
  const seen = new Set([baseCurrency])
  for (const rate of rates) {
    const other = rate.from === baseCurrency ? rate.to : rate.to === baseCurrency ? rate.from : null
    if (!other || seen.has(other)) continue
    seen.add(other)
    rows.push({
      code: other,
      isBase: false,
      // Convert() reads a stored row as "1 unit of `from` = `rate` units of `to`".
      rateLabel: rate.from === baseCurrency ? `1 ${baseCurrency} = ${rate.rate} ${other}` : `1 ${other} = ${rate.rate} ${baseCurrency}`,
      rate,
    })
  }
  return rows
}

export function TripCurrenciesManager({ tripCode, baseCurrency, canEdit, onBaseCurrencyChange }: {
  tripCode: string
  baseCurrency: string
  canEdit: boolean
  onBaseCurrencyChange: (code: string) => void
}) {
  const client = useQueryClient()
  const [newCode, setNewCode] = useState("")
  const [direction, setDirection] = useState<"direct" | "inverse">("direct")
  const [rateInput, setRateInput] = useState("")

  const rates = useQuery({ queryKey: qk.rates(tripCode), queryFn: async () => (await apiFetch<Rate[]>(`/api/trips/${tripCode}/exchange-rates`)).data ?? [] })
  const rows = rates.data ? deriveRows(baseCurrency, rates.data) : []
  const listedCodes = new Set(rows.map((row) => row.code))
  const available = SUPPORTED_CURRENCIES.filter((code) => !listedCodes.has(code))
  const refresh = () => client.invalidateQueries({ queryKey: qk.rates(tripCode) })

  const addCurrency = useMutation({
    mutationFn: (input: { from: string; to: string; rate: string }) =>
      apiFetch(`/api/trips/${tripCode}/exchange-rates`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
    onSuccess: async () => { setRateInput(""); toast.success("Currency added"); await refresh() },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not add currency"),
  })
  const removeCurrency = useMutation({
    mutationFn: (row: CurrencyRow) => apiFetch(`/api/trips/${tripCode}/exchange-rates?${new URLSearchParams({ from: row.rate!.from, to: row.rate!.to })}`, { method: "DELETE" }),
    onSuccess: async () => { toast.success("Currency removed"); await refresh() },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not remove currency"),
  })

  const code = newCode || available[0] || ""
  const entered = Number.parseFloat(rateInput)
  const previewLabel = entered
    ? (direction === "direct" ? `1 ${baseCurrency} = ${entered} ${code}` : `1 ${code} = ${entered} ${baseCurrency}`)
    : `e.g. "1 ${code} = 300 ${baseCurrency}" if that's easier than a decimal rate.`

  function submitAddCurrency() {
    if (!code || !entered) return
    const input = direction === "direct" ? { from: baseCurrency, to: code, rate: rateInput } : { from: code, to: baseCurrency, rate: rateInput }
    addCurrency.mutate(input)
    setNewCode("")
  }

  if (rates.isLoading) return <LoadingState label="Loading currencies…" />

  return (
    <div>
      <div className="mb-3.5 rounded-[14px] border border-border bg-white px-5">
        {rows.map((row) => (
          <div key={row.code} className="flex items-center justify-between gap-3 border-b border-[oklch(0.95_0.006_60)] py-3.5 last:border-0">
            <span className="text-sm font-bold">{row.code}</span>
            <span className="text-[13px] text-muted-foreground">{row.rateLabel}</span>
            {row.isBase ? (
              <Badge className="bg-[oklch(0.94_0.03_150)] text-[oklch(0.5_0.16_150)]">Base</Badge>
            ) : canEdit ? (
              <div className="flex items-center gap-2.5">
                <Button type="button" variant="outline" size="sm" className="h-auto rounded-[7px] px-2.5 py-1 text-xs font-semibold" onClick={() => onBaseCurrencyChange(row.code)}>Set as base</Button>
                <button
                  type="button"
                  className="text-xs font-semibold text-destructive disabled:opacity-50"
                  disabled={removeCurrency.isPending}
                  onClick={() => removeCurrency.mutate(row)}
                >
                  {removeCurrency.isPending ? <Spinner /> : "Remove"}
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {canEdit && available.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2.5">
            <NativeSelect value={code} onChange={(event) => setNewCode(event.target.value)}>
              {available.map((option) => <NativeSelectOption key={option} value={option}>{option}</NativeSelectOption>)}
            </NativeSelect>
            <div className="flex overflow-hidden rounded-[10px] border border-input">
              <button type="button" className={cn("px-3 py-2.5 text-xs font-bold", direction === "direct" ? "bg-primary text-primary-foreground" : "border-r border-input")} onClick={() => setDirection("direct")}>1 {baseCurrency} =</button>
              <button type="button" className={cn("px-3 py-2.5 text-xs font-bold", direction === "inverse" ? "bg-primary text-primary-foreground" : "")} onClick={() => setDirection("inverse")}>1 {code} =</button>
            </div>
            <Input className="min-w-[8rem] flex-1" inputMode="decimal" placeholder={`Rate to ${direction === "direct" ? code : baseCurrency}`} value={rateInput} onChange={(event) => setRateInput(event.target.value)} />
            <Button type="button" variant="secondary" className="font-bold" disabled={addCurrency.isPending} onClick={submitAddCurrency}>
              {addCurrency.isPending ? <><Spinner className="mr-1.5" />Adding…</> : "Add currency"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{previewLabel}</p>
        </div>
      ) : null}
    </div>
  )
}
