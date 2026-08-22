"use client"

import { BarChart3Icon, LuggageIcon, UserRoundIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const ITEMS = [
  { href: "/trips", label: "Trips", icon: LuggageIcon },
  { href: "/analytics", label: "Analytics", icon: BarChart3Icon },
  { href: "/account", label: "Account", icon: UserRoundIcon },
] as const

export function MobileAppNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary navigation"
      className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-50 grid h-[68px] grid-cols-3 border-t border-border bg-white/95 px-5 backdrop-blur md:hidden"
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href === "/trips" && pathname === "/trip/create")
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
