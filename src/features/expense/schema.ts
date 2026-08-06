import Decimal from "decimal.js"
import { z } from "zod"

const amount = z.string().trim().regex(/^\d+(?:\.\d{1,6})?$/, "Enter a valid amount")
const row = z.object({ userId: z.uuid(), amount }).strict()

export const expenseCreateSchema = z
  .object({
    expenseDate: z.iso.date(),
    description: z.string().trim().min(1).max(255),
    amount,
    currency: z.string().length(3).transform((value) => value.toUpperCase()),
    splitType: z.enum(["equal", "manual"]),
    payers: z.array(row).min(1),
    participants: z.array(z.uuid()).optional(),
    splits: z.array(row).optional(),
    note: z.string().max(2000).nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const total = new Decimal(value.amount)
    const payerTotal = value.payers.reduce((sum, payer) => sum.plus(payer.amount), new Decimal(0))
    if (!payerTotal.equals(total)) context.addIssue({ code: "custom", path: ["payers"], message: "Payers must sum to the expense amount" })
    if (new Set(value.payers.map((payer) => payer.userId)).size !== value.payers.length) context.addIssue({ code: "custom", path: ["payers"], message: "Each payer can appear only once" })
    if (value.splitType === "equal" && !value.participants?.length) context.addIssue({ code: "custom", path: ["participants"], message: "Choose at least one participant" })
    if (value.splitType === "manual") {
      const splitTotal = (value.splits ?? []).reduce((sum, split) => sum.plus(split.amount), new Decimal(0))
      if (!value.splits?.length || !splitTotal.equals(total)) context.addIssue({ code: "custom", path: ["splits"], message: "Splits must sum to the expense amount" })
    }
  })

export const expenseUpdateSchema = z.object({
  expenseDate: z.iso.date().optional(), description: z.string().trim().min(1).max(255).optional(),
  amount: amount.optional(), currency: z.string().length(3).optional(), splitType: z.enum(["equal", "manual"]).optional(),
  payers: z.array(row).min(1).optional(), participants: z.array(z.uuid()).optional(), splits: z.array(row).optional(),
  note: z.string().max(2000).nullable().optional(), version: z.number().int().positive(),
}).strict()

export const expenseRejectSchema = z.object({ reason: z.string().trim().min(1).max(500) }).strict()
