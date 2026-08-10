import Link from "next/link"

import { AuthShell } from "@/features/auth/auth-shell"
import { RegisterForm } from "@/features/auth/register-form"

export default function RegisterPage() {
  return (
    <AuthShell title="Create your account" description="Start splitting costs on your next trip."
      alternate={<>Already have an account? <Link className="font-medium text-primary hover:underline" href="/login">Sign in</Link></>}>
      <RegisterForm />
    </AuthShell>
  )
}
