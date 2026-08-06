import { z } from "zod"

const settingsFields = {
  name: z.string().trim().min(1).max(160),
  baseCurrency: z.string().length(3).transform((value) => value.toUpperCase()),
  editPermission: z.enum(["everyone", "own_only"]),
  approvalRequiredExpenses: z.boolean(),
  approvalRequiredSettlements: z.boolean(),
  multiCurrencyEnabled: z.boolean(),
  allowSettlementBeforeEnd: z.boolean(),
}

export const tripSchema = z
  .object({
    ...settingsFields,
    startDate: z.string().min(1),
    endDate: z.string().min(1),
  })
  .strict()
  .refine((value) => value.endDate >= value.startDate, {
    path: ["endDate"],
    message: "End date must be on or after start date",
  })

export const tripUpdateSchema = z.object({ ...settingsFields, version: z.number().int().positive() }).strict()

export const participantAddSchema = z.object({ userId: z.uuid() }).strict()

export const participantBankSchema = z
  .object({
    bankName: z.string().trim().min(1).max(120),
    accountNumber: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .refine((value) => !/^[•*]+/.test(value), "Enter the complete account number"),
    accountHolder: z.string().trim().min(1).max(160),
  })
  .strict()

export const participantUpdateSchema = z
  .object({
    bankInfo: participantBankSchema.optional(),
    role: z.enum(["planner", "participant"]).optional(),
  })
  .strict()
  .refine((value) => value.bankInfo !== undefined || value.role !== undefined, "An update is required")

export const invitationCreateSchema = z.object({ email: z.email().max(255) }).strict()

export type TripInput = z.infer<typeof tripSchema>
export type TripUpdateInput = z.infer<typeof tripUpdateSchema>
export type ParticipantBankInput = z.infer<typeof participantBankSchema>
