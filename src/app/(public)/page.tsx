import Link from "next/link"
import { ArrowRight, Calculator, Globe2, ReceiptText, Users } from "lucide-react"

import { SiteHeader } from "@/components/layout/site-header"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  { icon: Users, title: "Split together", copy: "Share each cost across the people who were actually involved." },
  { icon: Globe2, title: "Travel in any currency", copy: "Keep the original amount while TripMate settles in one base currency." },
  { icon: Calculator, title: "Settle with fewer transfers", copy: "Turn a web of IOUs into a clear, deterministic payment plan." },
  { icon: ReceiptText, title: "Keep an audit trail", copy: "Every expense, split, approval, and settlement stays explainable." },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-background to-background dark:from-sky-950/30">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 lg:grid-cols-[1.2fr_.8fr] lg:py-28">
          <div className="space-y-7">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Travel together. Settle clearly.</p>
            <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
              Shared trip expenses without the end-of-trip spreadsheet.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              TripMate records who paid, who shared, and what everyone owes—even when the trip spans multiple currencies.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className={buttonVariants({ size: "lg" })}>Create your first trip <ArrowRight className="size-4" /></Link>
              <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline" })}>Sign in</Link>
            </div>
          </div>
          <Card className="border-primary/15 bg-card/80 shadow-xl">
            <CardHeader><CardTitle>A clean path from purchase to settlement</CardTitle></CardHeader>
            <CardContent className="space-y-5 text-sm text-muted-foreground">
              <p><strong className="text-foreground">1. Record</strong> expenses with multiple payers and fair splits.</p>
              <p><strong className="text-foreground">2. Review</strong> balances converted with explicit rates.</p>
              <p><strong className="text-foreground">3. Settle</strong> through the smallest practical set of transfers.</p>
            </CardContent>
          </Card>
        </section>
        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, copy }) => (
              <Card key={title} className="bg-card/70">
                <CardHeader><Icon className="size-8 text-primary" aria-hidden="true" /><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
                <CardContent className="text-sm leading-6 text-muted-foreground">{copy}</CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
