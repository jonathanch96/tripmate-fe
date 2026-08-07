import Link from "next/link"
import { ApiError } from "@/lib/envelope"

export function missingRatePairs(error: unknown) {
  if (!(error instanceof ApiError) || error.envelope.code !== "EXCHANGE_RATE_MISSING") return []
  return [...error.message.matchAll(/[A-Z]{3}→[A-Z]{3}/g)].map(([pair]) => pair)
}

export function MissingRateState({ error, tripCode }: { error: unknown; tripCode: string }) {
  const pairs = missingRatePairs(error)
  if (pairs.length === 0) return null
  const query = new URLSearchParams({ pairs: pairs.join(",") })
  return <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"><h3 className="font-medium">Exchange rates needed</h3><p className="mt-1 text-sm">Add {pairs.join(", ")} before balances can be calculated.</p><Link className="mt-2 inline-block text-sm font-medium underline" href={`/trip/${tripCode}/final?${query}#rates`}>Fix exchange rates</Link></div>
}
