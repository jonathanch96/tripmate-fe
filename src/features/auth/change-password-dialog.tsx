"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import type { ReactElement } from "react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { changeExistingPasswordSchema, changePasswordSchema, type ChangePasswordInput } from "@/features/auth/schema"
import { apiFetch } from "@/lib/api-client"
import { ApiError } from "@/lib/envelope"
import { profileQuery } from "@/features/auth/profile"

// The dialog can drive itself from its own trigger, or be opened by a caller that has nowhere
// safe to put one — a dropdown item, say, whose menu unmounts the moment it is chosen and would
// take a dialog rendered inside it down with it.
export function ChangePasswordDialog({ trigger, open: controlledOpen, onOpenChange }: {
  trigger?: ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
} = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  // Only an account that has a password can be asked to re-enter it. Until the profile loads,
  // assume there is one: asking for a password the account turns out not to have is a moment's
  // confusion, while dropping the field from an account that has one looks like a security hole.
  const profile = useQuery(profileQuery())
  const hasPassword = profile.data?.hasPassword ?? true
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(hasPassword ? changeExistingPasswordSchema : changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  const mutation = useMutation({
    mutationFn: (values: ChangePasswordInput) =>
      apiFetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      toast.success(hasPassword ? "Password changed" : "Password set")
      form.reset()
      setOpen(false)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.envelope.code === "INVALID_CURRENT_PASSWORD") {
        form.setError("currentPassword", { message: "Current password is incorrect" })
        return
      }
      toast.error(error instanceof ApiError ? (error.envelope.errors[0]?.message ?? error.message) : "Could not change password")
    },
  })

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) form.reset() }}>
      {controlledOpen === undefined ? (
        <DialogTrigger render={trigger ?? <Button variant="outline" size="sm">Change password</Button>} />
      ) : null}
      <DialogContent className="rounded-[20px] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-[19px] font-extrabold">{hasPassword ? "Change password" : "Set a password"}</DialogTitle>
          <DialogDescription>
            {hasPassword ? null : "You signed in with Google, so this account has no password yet. Setting one lets you sign in with your email as well. "}
            Use at least 8 characters, with an uppercase letter, a lowercase letter, a number, and a symbol.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" method="post" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            {hasPassword ? (
              <FormField control={form.control} name="currentPassword" render={({ field }) => (
                <FormItem><FormLabel>Current password</FormLabel><FormControl><Input type="password" autoComplete="current-password" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            ) : null}
            <FormField control={form.control} name="newPassword" render={({ field }) => (
              <FormItem><FormLabel>New password</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem><FormLabel>Confirm new password</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="submit" className="w-full font-bold" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : hasPassword ? "Change password" : "Set password"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
