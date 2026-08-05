"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { authErrorCopy } from "@/features/auth/error-copy"
import { registerSchema, type RegisterInput } from "@/features/auth/schema"

type RegistrationResponse = { success: boolean; code: string }

export function RegisterForm() {
  const router = useRouter()
  const [error, setError] = useState<string>()
  const form = useForm<RegisterInput>({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", password: "" } })

  async function submit(values: RegisterInput) {
    setError(undefined)
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
      })
      const result = await response.json() as RegistrationResponse
      if (!response.ok || !result.success) {
        setError(authErrorCopy("register", result.code))
        return
      }
      const login = await signIn("credentials", { email: values.email, password: values.password, redirect: false })
      if (!login?.ok) {
        setError("Your account was created. Please sign in.")
        return
      }
      router.push("/")
      router.refresh()
    } catch {
      setError(authErrorCopy("register", undefined))
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Name</FormLabel><FormControl><Input autoComplete="name" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" autoComplete="email" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <p className="text-xs text-muted-foreground">Use at least 8 characters with a letter and a number.</p>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </Form>
  )
}
