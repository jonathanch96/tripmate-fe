import type { Metadata } from "next"

import { AuthShell } from "@/features/auth/auth-shell"
import { ConsentCard } from "@/features/oauth/consent-card"

export const metadata: Metadata = {
  title: "Connect an app",
  description: "Allow an AI assistant to use your TripMate account.",
  robots: { index: false, follow: false },
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

// Where /oauth/authorize sends the browser: the signed-in user (the proxy bounces anyone else to
// /login first) approves or denies an AI tool's request to use their account.
export default async function ConsentPage({ searchParams }: { searchParams: Promise<{ request_id?: string | string[]; error?: string | string[] }> }) {
  const params = await searchParams
  return (
    <AuthShell title="Connect an app" description="An AI assistant is asking to use your TripMate account."
      alternate={<>Only allow apps you trust and started connecting yourself.</>}>
      <ConsentCard requestId={first(params.request_id)} entryError={first(params.error)} />
    </AuthShell>
  )
}
