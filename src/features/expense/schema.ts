import Decimal from "decimal.js"
import { z } from "zod"

const amount = z.string().trim().regex(/^\d+(?:\.\d{1,6})?$/, "Enter a valid amount")
const row = z.object({ userId: z.uuid(), amount, weight: amount.optional() }).strict()
const splitTypeSchema = z.enum(["equal", "manual", "percent", "shares"])

// "Actually charged in" is optional and, once set, can be a currency-only memo (chargedAmount
// left blank) or paired with an amount. An empty string is the explicit "clear it" sentinel the
// backend expects on update - distinct from omitting the field, which leaves it unchanged.
const chargedCurrency = z.string().trim().transform((value) => value.toUpperCase()).refine((value) => value === "" || value.length === 3, "Enter a 3-letter currency code")
const chargedAmount = z.string().trim().refine((value) => value === "" || /^\d+(?:\.\d{1,6})?$/.test(value), "Enter a valid amount")

export const expenseCreateSchema = z
  .object({
    expenseDate: z.iso.date(),
    description: z.string().trim().min(1).max(255),
    amount,
    currency: z.string().length(3).transform((value) => value.toUpperCase()),
    chargedAmount: chargedAmount.optional(),
    chargedCurrency: chargedCurrency.optional(),
    categoryId: z.uuid().nullable().optional(),
    splitType: splitTypeSchema,
    payers: z.array(row).min(1),
    participants: z.array(z.uuid()).optional(),
    splits: z.array(row).optional(),
    note: z.string().max(2000).nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    let total: Decimal
    let payerTotal: Decimal
    try {
      total = new Decimal(value.amount)
      payerTotal = value.payers.reduce((sum, payer) => sum.plus(payer.amount), new Decimal(0))
    } catch {
      return
    }
    if (value.chargedAmount && !value.chargedCurrency) context.addIssue({ code: "custom", path: ["chargedCurrency"], message: "Choose a currency for the actually-charged amount" })
    if (!payerTotal.equals(total)) context.addIssue({ code: "custom", path: ["payers"], message: "Payers must sum to the expense amount" })
    if (new Set(value.payers.map((payer) => payer.userId)).size !== value.payers.length) context.addIssue({ code: "custom", path: ["payers"], message: "Each payer can appear only once" })
    if (value.splitType === "equal" && !value.participants?.length) context.addIssue({ code: "custom", path: ["participants"], message: "Choose at least one participant" })
    if (value.splitType === "manual") {
      let splitTotal: Decimal
      try {
        splitTotal = (value.splits ?? []).reduce((sum, split) => sum.plus(split.amount), new Decimal(0))
      } catch {
        return
      }
      if (!value.splits?.length || !splitTotal.equals(total)) context.addIssue({ code: "custom", path: ["splits"], message: "Splits must sum to the expense amount" })
    }
    if (value.splitType === "percent") {
      let weightTotal: Decimal
      try {
        weightTotal = (value.splits ?? []).reduce((sum, split) => sum.plus(split.weight ?? "0"), new Decimal(0))
      } catch {
        return
      }
      if (!value.splits?.length || !value.splits.every((split) => split.weight)) context.addIssue({ code: "custom", path: ["splits"], message: "Enter a percentage for each participant" })
      else if (!weightTotal.equals(100)) context.addIssue({ code: "custom", path: ["splits"], message: "Percentages must sum to 100" })
    }
    if (value.splitType === "shares") {
      // A share count of 0 is allowed - it just means that participant sat this particular
      // expense out - but every participant needs an explicit value, and at least one of them
      // needs to be positive or there's nothing to allocate.
      let shareTotal: Decimal
      try {
        shareTotal = (value.splits ?? []).reduce((sum, split) => sum.plus(split.weight ?? "0"), new Decimal(0))
      } catch {
        return
      }
      if (!value.splits?.length || !value.splits.every((split) => split.weight)) {
        context.addIssue({ code: "custom", path: ["splits"], message: "Enter a number of shares for each participant" })
      } else if (!shareTotal.greaterThan(0)) {
        context.addIssue({ code: "custom", path: ["splits"], message: "At least one participant needs a positive number of shares" })
      }
    }
  })

export const expenseUpdateSchema = z.object({
  expenseDate: z.iso.date().optional(), description: z.string().trim().min(1).max(255).optional(),
  amount: amount.optional(), currency: z.string().length(3).optional(),
  chargedAmount: chargedAmount.optional(), chargedCurrency: chargedCurrency.optional(),
  categoryId: z.uuid().nullable().optional(),
  splitType: splitTypeSchema.optional(),
  payers: z.array(row).min(1).optional(), participants: z.array(z.uuid()).optional(), splits: z.array(row).optional(),
  note: z.string().max(2000).nullable().optional(), version: z.number().int().positive(),
}).strict().superRefine((value, context) => {
  if (value.chargedAmount && !value.chargedCurrency) context.addIssue({ code: "custom", path: ["chargedCurrency"], message: "Choose a currency for the actually-charged amount" })
})

export const expenseRejectSchema = z.object({ reason: z.string().trim().min(1).max(500) }).strict()

export const expenseCategoryCreateSchema = z.object({ name: z.string().trim().min(1).max(50) }).strict()
