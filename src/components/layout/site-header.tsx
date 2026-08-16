"use client"

import { ChevronDownIcon } from "lucide-react"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"

import { BrandMark } from "@/components/layout/brand-mark"
import { buttonVariants } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChangePasswordDialog } from "@/features/auth/change-password-dialog"

export function SiteHeader() {
  const { data: session, status } = useSession()

  return (
    <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-10">
        <Link href={status === "authenticated" ? "/trips" : "/"} className="flex items-center gap-2.5 font-heading text-lg font-extrabold tracking-tight">
          <BrandMark />
          <span>TripMate</span>
        </Link>
        <nav aria-label="Primary navigation" className="flex items-center gap-3">
          {/* While the session resolves, render nothing rather than "Sign in" — a signed-in
              visitor should never see a sign-in prompt flash in their own header. */}
          {status === "loading" ? null : status === "authenticated" ? (
            <>
              <Link href="/trips" className={buttonVariants({ variant: "ghost", size: "sm" })}>My trips</Link>
              <Link href="/trip/create" className={buttonVariants({ size: "sm" })}>Create trip</Link>
              <DropdownMenu>
                <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}>
                  <span className="max-w-40 truncate">{session?.user?.name ?? session?.user?.email}</span>
                  <ChevronDownIcon className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <ChangePasswordDialog />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ size: "sm" })}>Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  )
}
