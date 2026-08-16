"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { safeDecimal } from "@/lib/money"
import type { ItemInput, Receipt, ReceiptItem } from "@/features/receipt/types"

export function ReceiptItemTable({ receipt, pending, onUpdate, onAdd, onDelete }: { receipt: Receipt; pending: boolean; onUpdate: (item: ReceiptItem, input: ItemInput) => void; onAdd: () => void; onDelete: (item: ReceiptItem) => void }) {
  const itemTotal = receipt.items.reduce((sum, item) => sum.plus(safeDecimal(item.totalPrice)), safeDecimal(0))
  const expected = safeDecimal(receipt.subtotal)
  return <section className="space-y-2">
    <div className="flex items-end justify-between"><div><h3 className="font-medium">Line items</h3><p className="text-xs text-muted-foreground">Correct anything the scanner misread.</p></div><Button type="button" size="sm" variant="outline" onClick={onAdd} disabled={pending}><Plus /> Add row</Button></div>
    <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[620px] text-sm"><thead className="bg-muted/50 text-left"><tr><th className="p-2">Item</th><th className="w-24 p-2">Qty</th><th className="w-32 p-2">Unit price</th><th className="w-32 p-2">Total</th><th className="w-12 p-2"><span className="sr-only">Actions</span></th></tr></thead><tbody>{receipt.items.map((item) => <tr key={item.id} className="border-t">
      <td className="p-2"><Input defaultValue={item.name} aria-label={`${item.name} name`} onBlur={(event) => event.target.value !== item.name && onUpdate(item, { name: event.target.value })} /></td>
      <td className="p-2"><Input defaultValue={item.quantity} inputMode="decimal" aria-label={`${item.name} quantity`} onBlur={(event) => event.target.value !== item.quantity && onUpdate(item, { quantity: event.target.value })} /></td>
      <td className="p-2"><Input defaultValue={item.unitPrice} inputMode="decimal" aria-label={`${item.name} unit price`} onBlur={(event) => event.target.value !== item.unitPrice && onUpdate(item, { unitPrice: event.target.value })} /></td>
      <td className="p-2"><Input defaultValue={item.totalPrice} inputMode="decimal" aria-label={`${item.name} total price`} onBlur={(event) => event.target.value !== item.totalPrice && onUpdate(item, { totalPrice: event.target.value })} /></td>
      <td className="p-2"><Button type="button" size="icon-sm" variant="ghost" aria-label={`Delete ${item.name}`} onClick={() => onDelete(item)} disabled={pending}><Trash2 /></Button></td>
    </tr>)}</tbody></table></div>
    <p className={`text-sm ${!expected.isZero() && !itemTotal.equals(expected) ? "text-amber-600" : "text-muted-foreground"}`}>Items: {itemTotal.toString()}{!expected.isZero() ? ` · receipt subtotal: ${expected.toString()}` : ""}{!expected.isZero() && !itemTotal.equals(expected) ? " — check the highlighted mismatch before continuing." : ""}</p>
  </section>
}
