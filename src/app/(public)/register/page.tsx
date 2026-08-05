import Link from "next/link"

import { AuthShell } from "@/features/auth/auth-shell"
import { RegisterForm } from "@/features/auth/register-form"

export default function RegisterPage() {
  return (
    <AuthShell title="Create your account" description="Start a trip and keep every shared expense clear."
      alternate={<>Already have an account? <Link className="font-medium text-primary hover:underline" href="/login">Sign in</Link></>}>
      <RegisterForm />
    </AuthShell>
  )
}
