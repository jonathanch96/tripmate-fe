"use client"

import Link from "next/link"
import { signOut, useSession } from "next-auth/react"

import { BrandMark } from "@/components/layout/brand-mark"
import { Button, buttonVariants } from "@/components/ui/button"

export function SiteHeader() {
  const { data: session, status } = useSession()

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-[1180px] items-center justify-between px-5 md:px-10">
        <Link href={status === "authenticated" ? "/trips" : "/"} className="flex items-center gap-2.5 font-heading text-lg font-extrabold tracking-tight">
          <BrandMark />
          <span>TripMate</span>
        </Link>
        <nav aria-label="Primary navigation" className="flex items-center gap-2 sm:gap-5">
          {/* While the session resolves, render nothing rather than "Sign in" — a signed-in
              visitor should never see a sign-in prompt flash in their own header. */}
          {status === "loading" ? null : status === "authenticated" ? (
            <>
              <span className="hidden text-sm text-muted-foreground lg:inline">
                Hello, {session?.user?.name ?? session?.user?.email}
              </span>
              <Link href="/trips" className={buttonVariants({ variant: "ghost", size: "sm" })}>My trips</Link>
              <Link href="/trip/create" className={buttonVariants({ size: "sm" })}>Create trip</Link>
              <Button className="hidden sm:inline-flex" variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>Sign out</Button>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ size: "sm" })}>Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  )
}
