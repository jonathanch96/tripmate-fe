import { z } from "zod"

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[^A-Za-z0-9]/, "Password must contain a symbol")

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Password is required").max(128),
})

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  password: passwordSchema,
})

const passwordsMatch = {
  path: ["confirmPassword"],
  message: "Passwords must match",
}

// An account created through Google sign-in has no password at all, so there is nothing for its
// owner to type into "current password" and nothing for the server to verify — ChangePassword
// sets their first one instead. The field is therefore only demanded of accounts that have a
// password to re-enter; the server applies the same rule against the stored hash, so this cannot
// be used to skip the check on an account that does have one.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().max(128).optional(),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password").max(128),
  })
  .refine((value) => value.newPassword === value.confirmPassword, passwordsMatch)

export const changeExistingPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required").max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password").max(128),
  })
  .refine((value) => value.newPassword === value.confirmPassword, passwordsMatch)

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
