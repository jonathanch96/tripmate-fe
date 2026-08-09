"use client"

import Link from "next/link"
import { Plane } from "lucide-react"
import { signOut, useSession } from "next-auth/react"

import { Button, buttonVariants } from "@/components/ui/button"

export function SiteHeader() {
  const { data: session, status } = useSession()

  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href={status === "authenticated" ? "/trips" : "/"} className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Plane className="size-7 text-blue-600" aria-hidden="true" />
          <span>TripMate</span>
        </Link>
        <nav aria-label="Primary navigation" className="flex items-center gap-3">
          {/* While the session resolves, render nothing rather than "Sign in" — a signed-in
              visitor should never see a sign-in prompt flash in their own header. */}
          {status === "loading" ? null : status === "authenticated" ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                Hello, {session?.user?.name ?? session?.user?.email}
              </span>
              <Link href="/trips" className={buttonVariants({ variant: "ghost", size: "sm" })}>My trips</Link>
              <Link href="/trip/create" className={buttonVariants({ size: "sm" })}>Create trip</Link>
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>Sign out</Button>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ size: "sm" })}>Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  )
}
