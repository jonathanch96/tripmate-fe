import Link from "next/link"
import { ArrowRight, Calculator, Globe, Receipt, Users } from "lucide-react"

import { SiteHeader } from "@/components/layout/site-header"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo"

// Answers real questions in plain language so both search engines and AI answer engines (Google
// AI Overviews, ChatGPT, Perplexity, etc.) can lift them directly — rendered as visible copy below
// and mirrored in the FAQPage JSON-LD so the same content is machine-readable.
const faqs = [
  {
    question: "What is TripMate?",
    answer:
      "TripMate is a shared-trip expense tracker. It records who paid for what, how each cost is split across the people involved, and calculates what everyone owes so the group doesn't need a spreadsheet.",
  },
  {
    question: "How does TripMate split an expense fairly?",
    answer:
      "Each expense can have multiple payers and be shared across any subset of trip members, not just an even split across everyone. TripMate tracks the exact share each person owes for every expense.",
  },
  {
    question: "Can TripMate handle expenses in different currencies?",
    answer:
      "Yes. TripMate keeps the original currency and amount on each expense while converting everything to one base currency, using an explicit exchange rate, so balances stay comparable across a multi-currency trip.",
  },
  {
    question: "How does settling up work?",
    answer:
      "TripMate turns every outstanding balance in a trip into the smallest practical set of transfers between members, so instead of many small IOUs, each person makes as few payments as possible to settle up.",
  },
  {
    question: "How do I join a trip on TripMate?",
    answer:
      "A trip organizer creates a trip and shares its trip code with the group. Anyone with the code can request to join, and once added as a participant they can log expenses and see balances.",
  },
  {
    question: "Do I need to create an account to use TripMate?",
    answer:
      "Yes, a free TripMate account is required to create or join a trip. You can sign up with an email and password or continue with Google.",
  },
]

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
  // Structured data for search engines and AI answer engines: WebSite + SoftwareApplication
  // describe what TripMate is, and FAQPage mirrors the visible FAQ section verbatim so the two
  // never drift out of sync.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer,
          },
        })),
      },
    ],
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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

      <section className="container mx-auto px-4 pb-16">
        <h2 className="mb-12 text-center text-3xl font-bold">Frequently asked questions</h2>
        <div className="mx-auto max-w-3xl space-y-6">
          {faqs.map(({ question, answer }) => (
            <div key={question}>
              <h3 className="text-lg font-semibold">{question}</h3>
              <p className="mt-1 text-muted-foreground">{answer}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t bg-muted/40 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} TripMate. Shared-trip expenses without the spreadsheet.</p>
        </div>
      </footer>
    </div>
  )
}
