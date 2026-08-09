"use client"

import { AlertCircle, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function ExtractionProgress({ pending, error, onExtract, onManual }: { pending: boolean; error?: string; onExtract: () => void; onManual: () => void }) {
  if (pending) return <div className="space-y-3 rounded-lg border p-4"><div className="flex items-center gap-2 font-medium"><ScanLine className="size-4 animate-pulse" /> Reading every line item…</div><Skeleton className="h-6 w-2/3" /><Skeleton className="h-20 w-full" /><p className="text-xs text-muted-foreground">This can take up to 30 seconds.</p></div>
  if (error) return <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4"><p className="flex gap-2 text-sm text-destructive"><AlertCircle className="size-4 shrink-0" />{error}</p><div className="flex gap-2"><Button type="button" onClick={onExtract}>Retry</Button><Button type="button" variant="outline" onClick={onManual}>Enter manually</Button></div></div>
  return <Button type="button" className="w-full" onClick={onExtract}><ScanLine /> Extract line items</Button>
}
