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
    <main className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 size-72 -translate-x-1/3 translate-y-1/3 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <Link href="/" className="relative flex items-center gap-2 text-xl font-bold tracking-tight">
          <Plane className="size-7" aria-hidden="true" />
          TripMate
        </Link>
        <p className="relative font-heading text-3xl leading-tight font-semibold">
          Split every trip fairly, without the spreadsheet.
        </p>
      </div>
      <div className="flex w-full flex-1 items-center justify-center px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-md space-y-6">
          <Link href="/" className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight lg:hidden">
            <Plane className="size-7 text-primary" aria-hidden="true" />
            TripMate
          </Link>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-2xl">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
          <p className="text-center text-sm text-muted-foreground">{alternate}</p>
        </div>
      </div>
    </main>
  )
}
