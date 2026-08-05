import Link from "next/link"

import { AuthShell } from "@/features/auth/auth-shell"
import { LoginForm } from "@/features/auth/login-form"

function safeNext(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value
  return path?.startsWith("/") && !path.startsWith("//") ? path : "/"
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const params = await searchParams
  return (
    <AuthShell title="Welcome back" description="Sign in to continue planning and settling your trips."
      alternate={<>New to TripMate? <Link className="font-medium text-primary hover:underline" href="/register">Create an account</Link></>}>
      <LoginForm nextPath={safeNext(params.next)} />
    </AuthShell>
  )
}
