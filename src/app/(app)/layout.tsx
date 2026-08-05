import type { ReactNode } from "react"

import { SiteHeader } from "@/components/layout/site-header"

export default function AppLayout({ children }: { children: ReactNode }) {
  return <><SiteHeader /><main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main></>
}

