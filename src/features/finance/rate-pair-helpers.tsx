import type { Rate } from "@/features/finance/types"

export type RateDraft = { from: string; to: string; rate: string }

export const parsePair = (pair: string, fallbackTo: string): RateDraft => {
  const [from = "", to = ""] = pair.split("→")
  return { from: from.toUpperCase(), to: (to || fallbackTo).toUpperCase(), rate: "" }
}

export const normalizeCode = (code: string) => code.trim().toUpperCase()

// A currency pair is stored in one direction only — the backend retires the opposite row when a
// rate is saved. This finds the row that a draft is about to replace, so the planner is told first.
// Shared by the Final plan page's rate-setting form and TripCurrenciesManager's add-currency form.
export function opposingRate(rates: Rate[] | undefined, draft: Pick<RateDraft, "from" | "to">) {
  const from = normalizeCode(draft.from), to = normalizeCode(draft.to)
  if (!from || !to || from === to) return undefined
  return rates?.find((rate) => normalizeCode(rate.from) === to && normalizeCode(rate.to) === from)
}
