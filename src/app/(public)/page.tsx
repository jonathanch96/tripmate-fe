import Link from "next/link"
import { ArrowRight, Calculator, Globe, Receipt, Users } from "lucide-react"

import { SiteHeader } from "@/components/layout/site-header"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: Users,
    className: "text-blue-500",
    title: "Split with friends",
    description: "Share each cost across the people who were actually involved, with any number of payers.",
  },
  {
    icon: Globe,
    className: "text-green-500",
    title: "Multi-currency",
    description: "Keep the original amount while TripMate settles everything in one base currency.",
  },
  {
    icon: Calculator,
    className: "text-purple-500",
    title: "Smart settlement",
    description: "Turn a web of IOUs into the smallest practical set of transfers.",
  },
  {
    icon: Receipt,
    className: "text-orange-500",
    title: "Track everything",
    description: "Every expense, split, approval, and settlement stays explainable.",
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
      <SiteHeader />

      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
            Split Trip Expenses <span className="text-blue-600">Without the Hassle</span>
          </h1>
          <p className="mb-8 text-xl text-muted-foreground">
            TripMate records who paid, who shared, and what everyone owes—even when the trip spans
            multiple currencies.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/register" className={buttonVariants({ size: "lg" })}>
              Get started <ArrowRight className="ml-2 size-5" />
            </Link>
            <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline" })}>
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">How it works</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, className, title, description }) => (
            <Card key={title} className="border-0 shadow-lg transition-shadow hover:shadow-xl">
              <CardHeader>
                <Icon className={`mb-4 size-10 ${className}`} aria-hidden="true" />
                <CardTitle className="text-xl">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-16">
        <Card className="mx-auto max-w-2xl border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">
              A clean path from purchase to settlement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-900/80 dark:text-blue-100/80">
            <p><strong>1. Record</strong> expenses with multiple payers and fair splits.</p>
            <p><strong>2. Review</strong> balances converted with explicit rates.</p>
            <p><strong>3. Settle</strong> through the smallest practical set of transfers.</p>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t bg-muted/40 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} TripMate. Shared-trip expenses without the spreadsheet.</p>
        </div>
      </footer>
    </div>
  )
}
