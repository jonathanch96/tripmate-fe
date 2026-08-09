import { apiFetch } from "@/lib/api-client"
import type { ConvertPayload, ConvertedExpense, ItemInput, Receipt, ReceiptItem, ShareBreakdown } from "@/features/receipt/types"

const base = (code: string) => `/api/trips/${encodeURIComponent(code)}/receipts`

export async function uploadReceipt(code: string, file: File) {
  const body = new FormData(); body.set("file", file)
  return apiFetch<Receipt>(base(code), { method: "POST", body })
}
export async function getReceipt(code: string, id: string) { return apiFetch<Receipt>(`${base(code)}/${encodeURIComponent(id)}`) }
export async function extractReceipt(code: string, id: string) { return apiFetch<Receipt>(`${base(code)}/${encodeURIComponent(id)}/extract`, { method: "POST" }) }
export async function addReceiptItem(code: string, id: string, input: ItemInput) { return apiFetch<ReceiptItem>(`${base(code)}/${encodeURIComponent(id)}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }) }
export async function updateReceiptItem(code: string, receiptId: string, itemId: string, input: ItemInput) { return apiFetch<ReceiptItem>(`${base(code)}/${encodeURIComponent(receiptId)}/items/${encodeURIComponent(itemId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }) }
export async function deleteReceiptItem(code: string, receiptId: string, itemId: string) { return apiFetch<null>(`${base(code)}/${encodeURIComponent(receiptId)}/items/${encodeURIComponent(itemId)}`, { method: "DELETE" }) }
export async function saveAssignments(code: string, receiptId: string, assignments: { itemId: string; userIds: string[] }[]) { return apiFetch<null>(`${base(code)}/${encodeURIComponent(receiptId)}/assignments`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(assignments) }) }
export async function getShares(code: string, receiptId: string) { return apiFetch<ShareBreakdown>(`${base(code)}/${encodeURIComponent(receiptId)}/shares`) }
export async function convertReceipt(code: string, receiptId: string, payload: ConvertPayload) { return apiFetch<ConvertedExpense>(`${base(code)}/${encodeURIComponent(receiptId)}/convert`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }) }
