import Link from "next/link"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SiteHeader } from "@/components/layout/site-header"
import { buttonVariants } from "@/components/ui/button"
import { avatarColorFor, initialsOf } from "@/lib/avatar-colors"
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo"

// Answers real questions in plain language so both search engines and AI answer engines (Google
// AI Overviews, ChatGPT, Perplexity, etc.) can lift them directly — rendered as visible copy below
// and mirrored in the FAQPage JSON-LD so the same content is machine-readable.
const faqs = [
  {
    question: "Why not just split everything evenly and settle up from memory?",
    answer:
      "Because a real trip is never even. Amara covers the villa, Ken grabs cabs for two days, Priya pays for dinner and gets paid back for half of it later — a few days in, nobody can say who's actually ahead. Memory is exactly where these numbers go wrong: someone forgets they were paid back, someone double-counts a round of drinks. TripMate tracks every payer and every split as it happens, so the total at the end is calculated, not recalled.",
  },
  {
    question: "What is TripMate?",
    answer:
      "TripMate is a shared-trip expense tracker built around the one thing every group trip gets wrong: who actually owes what. It records who paid, who the cost was split with, and keeps a running balance for everyone, so settling up means reading a number instead of reconstructing a week from memory.",
  },
  {
    question: "How does TripMate split an expense fairly?",
    answer:
      "Each expense can have multiple payers and be shared across only the people it applies to, not a flat split across the whole group. If Amara and Ken split a cab that Priya wasn't in, that's exactly how it gets recorded.",
  },
  {
    question: "Can TripMate handle expenses in different currencies?",
    answer:
      "Yes. Log an expense in whatever currency you actually paid in — cash, a card statement, a local booking — and TripMate converts it to one base currency at a rate you set, so every balance stays comparable no matter how many currencies the trip touched.",
  },
  {
    question: "How does settling up work?",
    answer:
      "Instead of five people paying each other back six different ways, TripMate collapses every outstanding balance into the smallest possible set of transfers — it tells you exactly who pays who, once, to close the trip out.",
  },
  {
    question: "How do I join a trip on TripMate?",
    answer:
      "The trip organizer creates the trip and shares its trip code with the group. Anyone with the code can request to join, and once added they can log expenses and see balances immediately.",
  },
  {
    question: "Do I need to create an account to use TripMate?",
    answer:
      "Yes, a free TripMate account is required to create or join a trip. You can sign up with an email and password or continue with Google.",
  },
]

const features = [
  {
    title: "Multiple payers, one expense",
    description: "Split a bill three people covered without faking a single payer.",
  },
  {
    title: "Real exchange rates",
    description: "Log an expense in the local currency and override the rate when a card statement disagrees.",
  },
  {
    title: "Fewest payments to settle",
    description: "TripMate collapses every IOU into the smallest set of transfers to close the trip out.",
  },
  {
    title: "One ledger per person",
    description: "See every charge and payment touching a member, running balance included.",
  },
]

function HeroPreview() {
  return (
    <div className="mx-auto mt-13 max-w-[900px] overflow-hidden rounded-[18px] border border-border bg-card text-left shadow-[0_30px_70px_-15px_oklch(0.3_0.05_255_/_0.25)]">
      <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4.5 py-3">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-success/60" />
        <span className="ml-2 text-xs font-bold text-muted-foreground">Bali Getaway · Overview</span>
      </div>
      <div className="p-6.5 sm:p-7">
        <div className="mb-5.5 grid grid-cols-3 gap-3.5">
          <div className="rounded-xl bg-muted/60 p-4">
            <p className="mb-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Your balance</p>
            <p className="text-xl font-extrabold text-success">+$340.00</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-4">
            <p className="mb-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Total spend</p>
            <p className="text-xl font-extrabold">$2,180.00</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-4">
            <p className="mb-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Members</p>
            <p className="text-xl font-extrabold">5</p>
          </div>
        </div>
        <p className="mb-3 text-xs font-bold tracking-wide text-muted-foreground uppercase">Who owes who</p>
        <div className="flex flex-col gap-2.5">
          {[
            { name: "Amara", owes: "Jordan", amount: "$120.00" },
            { name: "Ken", owes: "Jordan", amount: "$220.00" },
          ].map((row) => (
            <div key={row.name} className="flex items-center gap-3 rounded-lg bg-muted/60 px-4 py-3">
              <Avatar size="sm"><AvatarFallback className={avatarColorFor(row.name)}>{initialsOf(row.name)}</AvatarFallback></Avatar>
              <span className="flex-1 text-sm font-semibold">{row.name} owes {row.owes}</span>
              <span className="text-sm font-extrabold text-success">{row.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

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
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />

      <section className="bg-accent/40 px-6 py-16 text-center md:px-10 md:py-20">
        <h1 className="mx-auto max-w-3xl font-heading text-[32px] leading-tight font-extrabold sm:text-[44px]">
          Know exactly who owes who<span className="text-primary">.</span>
        </h1>
        <p className="mx-auto mt-4.5 max-w-xl text-base leading-relaxed text-muted-foreground">
          {SITE_DESCRIPTION}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/register" className={buttonVariants({ size: "lg", className: "font-bold" })}>Get started free</Link>
          <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline", className: "font-bold" })}>Sign in</Link>
        </div>

        <HeroPreview />
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 md:px-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ title, description }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5.5">
              <h3 className="mb-2 font-heading text-base font-extrabold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border px-6 py-16 md:px-10">
        <h2 className="mb-10 text-center font-heading text-2xl font-extrabold">Frequently asked questions</h2>
        <div className="mx-auto max-w-3xl space-y-6">
          {faqs.map(({ question, answer }) => (
            <div key={question}>
              <h3 className="font-heading text-base font-bold">{question}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{answer}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-6 text-center">
        <p className="text-[13px] text-muted-foreground">© {new Date().getFullYear()} {SITE_NAME}</p>
      </footer>
    </div>
  )
}
