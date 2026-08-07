import { z } from "zod"

const currency = z.string().trim().length(3).transform((value) => value.toUpperCase())
const positiveDecimal = z.string().trim().regex(/^\d+(?:\.\d+)?$/).refine((value) => Number(value) > 0, "Must be greater than zero")

export const settlementCreateSchema = z.object({
  fromUserId: z.uuid(), toUserId: z.uuid(), amount: positiveDecimal, currency,
  method: z.enum(["cash", "bank_transfer"]), note: z.string().trim().max(2000).optional(), proofUrl: z.url().optional(),
}).refine((value) => value.fromUserId !== value.toUserId, { path: ["toUserId"], message: "Payer and recipient must differ" })

export const settlementRejectSchema = z.object({ reason: z.string().trim().min(1).max(1000) })
export const rateSetSchema = z.object({ from: currency, to: currency, rate: positiveDecimal }).refine((value) => value.from !== value.to, { path: ["to"], message: "Currencies must differ" })
