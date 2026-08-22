"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import type { ReactElement } from "react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { changePasswordSchema, type ChangePasswordInput } from "@/features/auth/schema"
import { apiFetch } from "@/lib/api-client"
import { ApiError } from "@/lib/envelope"

export function ChangePasswordDialog({ trigger }: { trigger?: ReactElement } = {}) {
  const [open, setOpen] = useState(false)
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
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
      toast.success("Password changed")
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
      <DialogTrigger render={trigger ?? <DropdownMenuItem>Change password</DropdownMenuItem>} />
      <DialogContent className="rounded-[20px] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-[19px] font-extrabold">Change password</DialogTitle>
          <DialogDescription>Use at least 8 characters, with an uppercase letter, a lowercase letter, a number, and a symbol.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" method="post" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <FormField control={form.control} name="currentPassword" render={({ field }) => (
              <FormItem><FormLabel>Current password</FormLabel><FormControl><Input type="password" autoComplete="current-password" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="newPassword" render={({ field }) => (
              <FormItem><FormLabel>New password</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem><FormLabel>Confirm new password</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="submit" className="w-full font-bold" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Changing…" : "Change password"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
