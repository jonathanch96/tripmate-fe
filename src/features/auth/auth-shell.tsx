import type { ReactNode } from "react"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function AuthShell({ title, description, alternate, children }: {
  title: string
  description: string
  alternate: ReactNode
  children: ReactNode
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 to-background px-4 py-12 dark:from-sky-950/30">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="block text-center text-2xl font-bold tracking-tight">TripMate</Link>
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
