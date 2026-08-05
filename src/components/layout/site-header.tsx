import Link from "next/link"
import { Plane } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Plane className="size-5" aria-hidden="true" />
          </span>
          <span>TripMate</span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/login" className={buttonVariants({ variant: "outline" })}>Sign in</Link>
        </nav>
      </div>
    </header>
  )
}
