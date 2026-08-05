"use client"

import type { ReactNode } from "react"
import { SessionProvider } from "next-auth/react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryProvider } from "@/components/providers/query-provider"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryProvider>
    </SessionProvider>
  )
}

