"use client"
/* eslint-disable @next/next/no-img-element -- receipt URLs are short-lived signed object URLs and cannot use the image optimizer */

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PayerEditor } from "@/features/expense/components/payer-editor"
import type { MoneyRow } from "@/features/expense/types"
import { addReceiptItem, convertReceipt, deleteReceiptItem, extractReceipt, getReceipt, getShares, saveAssignments, updateReceiptItem, uploadReceipt } from "@/features/receipt/api"
import { ExtractionProgress } from "@/features/receipt/components/extraction-progress"
import { ItemAssignmentGrid } from "@/features/receipt/components/item-assignment-grid"
import { ReceiptItemTable } from "@/features/receipt/components/receipt-item-table"
import { ReceiptUploader } from "@/features/receipt/components/receipt-uploader"
import { SharePreview } from "@/features/receipt/components/share-preview"
import type { ItemInput, Receipt, ReceiptItem, ShareBreakdown } from "@/features/receipt/types"
import type { Participant, Trip } from "@/features/trip/types"
import { ApiError } from "@/lib/envelope"
import { formatMoney, safeDecimal } from "@/lib/money"

type ManualDefaults = { description: string; amount: string; currency: string; expenseDate: string }

export function ReceiptWorkflow({ trip, participants, onConverted, onManual }: { trip: Trip; participants: Participant[]; onConverted: () => void; onManual: (defaults: ManualDefaults) => void }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [preview, setPreview] = useState("")
  const [shares, setShares] = useState<ShareBreakdown | null>(null)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(trip.startDate)
  const [payers, setPayers] = useState<MoneyRow[]>([{ userId: participants[0]?.userId ?? "", amount: "" }])

  async function refreshShares(id = receipt?.id) { if (!id) return; setBusy("shares"); try { const response = await getShares(trip.code, id); setShares(response.data); if (response.data && payers.length === 1 && !payers[0].amount) setPayers([{ ...payers[0], amount: response.data.total }]) } finally { setBusy("") } }
  async function runExtract(current: Receipt) {
    setBusy("extract"); setError("")
    try {
      const response = await extractReceipt(trip.code, current.id)
      if (!response.data) throw new Error("The server returned no receipt")
      setReceipt(response.data); setDescription(response.data.merchant ?? ""); setDate(response.data.receiptDate ?? trip.startDate)
      await refreshShares(response.data.id)
      toast.success("Receipt extracted")
    } catch (cause) {
      const code = cause instanceof ApiError ? cause.envelope.code : ""
      setError(code === "OCR_UNPARSEABLE" ? "The scanner could not understand this receipt. Retry or enter it manually." : code === "OCR_PROVIDER_ERROR" ? "The receipt scanner is temporarily unavailable. Retry or enter it manually." : cause instanceof Error ? cause.message : "Could not extract this receipt.")
    } finally { setBusy("") }
  }
  async function select(file: File, localPreview: string) {
    setPreview(localPreview); setReceipt(null); setShares(null); setError(""); setBusy("upload")
    try { const response = await uploadReceipt(trip.code, file); if (!response.data) throw new Error("Upload failed"); setReceipt(response.data); await runExtract(response.data) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not upload this receipt."); setBusy("") }
  }
  function replaceItem(updated: ReceiptItem) { setReceipt((current) => current ? { ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) } : current) }
  async function updateItem(item: ReceiptItem, input: ItemInput) { if (!receipt) return; setBusy("item"); try { const response = await updateReceiptItem(trip.code, receipt.id, item.id, input); if (response.data) replaceItem(response.data); await refreshShares() } catch { toast.error("Could not update the line item") } finally { setBusy("") } }
  async function addItem() { if (!receipt) return; const name = window.prompt("Item name"); if (!name?.trim()) return; setBusy("item"); try { const response = await addReceiptItem(trip.code, receipt.id, { name, quantity: "1", unitPrice: "0", totalPrice: "0" }); if (response.data) setReceipt({ ...receipt, items: [...receipt.items, response.data] }); await refreshShares() } catch { toast.error("Could not add the line item") } finally { setBusy("") } }
  async function removeItem(item: ReceiptItem) { if (!receipt) return; setBusy("item"); try { await deleteReceiptItem(trip.code, receipt.id, item.id); setReceipt({ ...receipt, items: receipt.items.filter((value) => value.id !== item.id) }); await refreshShares() } catch { toast.error("Could not delete the line item") } finally { setBusy("") } }
  async function assignments(items: ReceiptItem[]) { if (!receipt) return; const previous = receipt.items; setReceipt({ ...receipt, items }); setBusy("assign"); try { await saveAssignments(trip.code, receipt.id, items.map((item) => ({ itemId: item.id, userIds: item.assigneeIds }))); await refreshShares() } catch { setReceipt({ ...receipt, items: previous }); toast.error("Could not save assignments") } finally { setBusy("") } }
  async function convert() { if (!receipt || !shares) return; setBusy("convert"); try { await convertReceipt(trip.code, receipt.id, { description, expenseDate: date, payers }); toast.success("Expense created from receipt"); onConverted() } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Could not convert the receipt") } finally { setBusy("") } }
  async function refreshImage() { if (!receipt) return; try { const response = await getReceipt(trip.code, receipt.id); if (response.data) setReceipt(response.data) } catch { /* local preview remains available */ } }

  if (!receipt) return <div className="space-y-3"><ReceiptUploader pending={busy === "upload"} onSelect={select} />{preview ? <img src={preview} alt="Receipt preview" className="mx-auto max-h-64 rounded-md object-contain" /> : null}{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}</div>
  const manual = () => onManual({ description: receipt.merchant ?? description, amount: receipt.total ?? shares?.total ?? "", currency: receipt.currency ?? trip.baseCurrency, expenseDate: receipt.receiptDate ?? date })
  if (receipt.status !== "extracted") return <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div>{preview || receipt.imageUrl ? <img src={preview || receipt.imageUrl} onError={refreshImage} alt="Uploaded receipt" className="mx-auto max-h-80 rounded-md object-contain" /> : null}</div><ExtractionProgress pending={busy === "extract" || busy === "upload"} error={error} onExtract={() => runExtract(receipt)} onManual={manual} /></div>
  const total = shares?.total ?? receipt.total ?? ""
  const paid = payers.reduce((sum, payer) => sum.plus(safeDecimal(payer.amount)), safeDecimal(0))
  const canConvert = Boolean(shares && shares.unassignedItems.length === 0 && payers.length > 0 && paid.equals(safeDecimal(total)))
  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-[14rem_1fr]"><img src={receipt.imageUrl || preview} onError={refreshImage} alt="Receipt" className="max-h-64 w-full rounded-md bg-muted object-contain" /><div className="grid content-start gap-3"><label>Description<Input value={description} onChange={(event) => setDescription(event.target.value)} /></label><label>Date<Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><p className="text-sm"><span className="text-muted-foreground">Receipt total:</span> {formatMoney(receipt.total ?? total, receipt.currency ?? trip.baseCurrency)}</p></div></div>
    <ReceiptItemTable receipt={receipt} pending={busy === "item"} onUpdate={updateItem} onAdd={addItem} onDelete={removeItem} />
    <ItemAssignmentGrid items={receipt.items} participants={participants} pending={busy === "assign"} onChange={assignments} />
    <SharePreview shares={shares} participants={participants} loading={busy === "shares" || busy === "assign"} />
    <PayerEditor amount={total} currency={receipt.currency ?? trip.baseCurrency} rows={payers} participants={participants} onChange={setPayers} />
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={manual}>Enter manually instead</Button><Button type="button" disabled={!canConvert || busy === "convert"} onClick={convert}>{busy === "convert" ? "Creating expense…" : "Create one expense"}</Button></div>
  </div>
}
