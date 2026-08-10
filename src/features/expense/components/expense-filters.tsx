"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import type { ExpenseCategory } from "@/features/expense/types"
import type { Participant } from "@/features/trip/types"

export function ExpenseFilters({ participants, currencies, categories }: { participants: Participant[]; currencies: string[]; categories: ExpenseCategory[] }) {
  const router = useRouter(), pathname = usePathname(), current = useSearchParams()
  function set(key: string, value: string) { const params = new URLSearchParams(current); if (value) params.set(key, value); else params.delete(key); params.delete("page"); router.replace(`${pathname}?${params}`) }
  return <div className="grid gap-2 rounded-xl border p-3 md:grid-cols-7">
    <Input aria-label="Search expenses" placeholder="Search" defaultValue={current.get("q") ?? ""} onBlur={(event) => set("q", event.target.value)} />
    <NativeSelect aria-label="Status" value={current.get("status") ?? ""} onChange={(event) => set("status", event.target.value)}><NativeSelectOption value="">All statuses</NativeSelectOption><NativeSelectOption value="pending">Pending</NativeSelectOption><NativeSelectOption value="approved">Approved</NativeSelectOption><NativeSelectOption value="rejected">Rejected</NativeSelectOption></NativeSelect>
    <NativeSelect aria-label="Category" value={current.get("category_id") ?? ""} onChange={(event) => set("category_id", event.target.value)}><NativeSelectOption value="">All categories</NativeSelectOption>{categories.map((category) => <NativeSelectOption key={category.id} value={category.id}>{category.name}</NativeSelectOption>)}</NativeSelect>
    <NativeSelect aria-label="Payer" value={current.get("payer_user_id") ?? ""} onChange={(event) => set("payer_user_id", event.target.value)}><NativeSelectOption value="">All payers</NativeSelectOption>{participants.map((participant) => <NativeSelectOption key={participant.userId} value={participant.userId}>{participant.user?.name ?? participant.user?.email ?? "Participant"}</NativeSelectOption>)}</NativeSelect>
    <NativeSelect aria-label="Currency" value={current.get("currency") ?? ""} onChange={(event) => set("currency", event.target.value)}><NativeSelectOption value="">All currencies</NativeSelectOption>{currencies.map((currency) => <NativeSelectOption key={currency} value={currency}>{currency}</NativeSelectOption>)}</NativeSelect>
    <Input aria-label="From date" type="date" value={current.get("date_from") ?? ""} onChange={(event) => set("date_from", event.target.value)} />
    <Input aria-label="To date" type="date" value={current.get("date_to") ?? ""} onChange={(event) => set("date_to", event.target.value)} />
  </div>
}
