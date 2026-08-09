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
import { loginSchema, type LoginInput } from "@/features/auth/schema"

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter()
  const [error, setError] = useState<string>()
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } })

  async function submit(values: LoginInput) {
    setError(undefined)
    try {
      const result = await signIn("credentials", { ...values, redirect: false })
      if (!result?.ok) {
        const code = result?.error === "CredentialsSignin" ? "INVALID_CREDENTIALS" : result?.error
        setError(authErrorCopy("login", code))
        return
      }
      router.push(nextPath)
      router.refresh()
    } catch {
      setError(authErrorCopy("login", undefined))
    }
  }

  return (
    <Form {...form}>
      {/* method="post" is the safety net, not the transport: submitting stays client-side once
          hydrated, but a submit that beats hydration would otherwise default to GET and write
          the email and password into the URL, browser history, and any access log. */}
      <form className="space-y-4" method="post" onSubmit={form.handleSubmit(submit)}>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" autoComplete="email" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" autoComplete="current-password" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </Form>
  )
}
