import type { ReactNode } from "react"
import Link from "next/link"
import { Plane } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function AuthShell({ title, description, alternate, children }: {
  title: string
  description: string
  alternate: ReactNode
  children: ReactNode
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4 py-12 dark:from-blue-950/20 dark:to-background">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight">
          <Plane className="size-7 text-blue-600" aria-hidden="true" />
          TripMate
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground">{alternate}</p>
      </div>
    </main>
  )
}
