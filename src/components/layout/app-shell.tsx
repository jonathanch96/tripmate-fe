"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { SiteHeader } from "@/components/layout/site-header"

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isTripWorkspace = /^\/trip\/[^/]+(?:\/|$)/.test(pathname) && pathname !== "/trip/create"

  if (isTripWorkspace) return <>{children}</>

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-10 md:px-10 md:py-11">
        {children}
      </main>
    </>
  )
}
