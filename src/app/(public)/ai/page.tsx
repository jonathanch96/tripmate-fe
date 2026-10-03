import {
  ArrowRightIcon,
  BarChart3Icon,
  HandCoinsIcon,
  PlaneIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserPlusIcon,
  WalletIcon,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { SiteHeader } from "@/components/layout/site-header"
import { buttonVariants } from "@/components/ui/button"
import { ChatDemo } from "@/features/ai/chat-demo"
import { McpUrlField } from "@/features/oauth/mcp-url-field"
import { SITE_NAME, SITE_URL } from "@/lib/seo"

const title = "Use TripMate in Claude, ChatGPT and other AI assistants"
const description =
  "Connect TripMate to your AI assistant. Snap a bill, say who had what, and the split lands in your trip - tax, service and discounts shared fairly. Add expenses and check who owes who just by asking."

export const metadata: Metadata = {
  title: "AI assistants",
  description,
  alternates: { canonical: "/ai" },
  openGraph: { title, description, url: `${SITE_URL}/ai` },
  twitter: { title, description },
}

const asks = [
  { icon: ReceiptTextIcon, title: "Split a bill", prompt: "“Here's the receipt from dinner - split it for the Bali trip.”" },
  { icon: WalletIcon, title: "Add an expense", prompt: "“Budi paid 90,000 for the taxi, split it with everyone.”" },
  { icon: BarChart3Icon, title: "Check balances", prompt: "“Who owes who on the Bali trip?”" },
  { icon: HandCoinsIcon, title: "Record a repayment", prompt: "“Carol paid me back 20,000 in cash.”" },
  { icon: PlaneIcon, title: "Start a trip", prompt: "“Create a trip for Lombok, 5 to 9 October, in IDR.”" },
  { icon: UserPlusIcon, title: "Add a friend", prompt: "“Add dewi@example.com to the Lombok trip.”" },
]

const clients = [
  {
    name: "Claude",
    steps: [
      "Open claude.ai (or the Claude app) and go to Settings → Connectors.",
      "Choose Add custom connector, name it TripMate, and paste the server URL.",
      "Click Connect, sign in to TripMate, and press Allow.",
      "In a chat, turn TripMate on from the tools menu and start asking.",
    ],
  },
  {
    name: "ChatGPT",
    steps: [
      "Open Settings → Apps & Connectors. On some plans you first turn on Developer mode under Advanced.",
      "Create a new connector, name it TripMate, and paste the server URL. Authentication is OAuth.",
      "Sign in to TripMate when asked and press Allow.",
      "Pick TripMate in a new chat and ask away.",
    ],
  },
  {
    name: "Other MCP apps",
    steps: [
      "Any app that supports remote MCP servers works - Claude Desktop, Cursor, VS Code, MCP Inspector and more.",
      "Add a remote server (Streamable HTTP) with the server URL. No API key is needed.",
      "The app opens TripMate to sign in. Press Allow.",
      "That's it - the app handles tokens and refreshing for you.",
    ],
  },
]

const safety = [
  { title: "You decide what it can do", detail: "Allow viewing only, or viewing plus adding. You choose on the sign-in screen." },
  { title: "Nothing gets deleted", detail: "Assistants can't delete anything, change trip settings, or finalize a trip." },
  { title: "Only your trips", detail: "It sees exactly what you see - the trips you're part of, nothing else." },
  { title: "Disconnect in one tap", detail: "Your Account page lists every connected app. Disconnecting takes effect immediately." },
]

const faqs = [
  {
    question: "Which AI assistants work with TripMate?",
    answer: "Any assistant that supports MCP (Model Context Protocol) remote servers, including Claude and ChatGPT. You add TripMate once as a custom connector using the server URL on this page, then sign in.",
  },
  {
    question: "How does splitting a bill work?",
    answer: "Send the assistant a photo of the bill. It reads the items, finds the trip that matches the bill's date (and asks if more than one does), lists the items and trip members, and asks who had what. TripMate then calculates each person's share - tax, service charge and discounts are spread in proportion to what each person had - and the assistant shows you the totals before saving.",
  },
  {
    question: "Does the assistant do the maths?",
    answer: "No. The assistant reads the bill and asks you who had what; TripMate does the calculation. If the numbers on the bill don't add up, TripMate says so instead of saving something wrong.",
  },
  {
    question: "Can I see what the assistant added?",
    answer: "Yes. Everything shows up in your trip like any other expense, marked with the app that added it (for example “via Claude”), with the itemised breakdown in the note.",
  },
  {
    question: "Is it safe?",
    answer: "You sign in to TripMate yourself and approve the app - the assistant never sees your password. It can only reach the trips you're part of, can't delete anything, and you can disconnect it at any time from your Account page.",
  },
  {
    question: "Does it cost anything?",
    answer: "Connecting TripMate is free. You need an assistant plan that supports custom connectors.",
  },
]

export default function AiAssistantsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })),
  }

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />

      <section className="bg-accent/40 px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_minmax(0,460px)]">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <SparklesIcon className="size-3.5" /> New
            </span>
            <h1 className="mt-4 font-heading text-[32px] leading-tight font-extrabold sm:text-[44px]">
              Snap the bill. Your AI assistant splits it<span className="text-primary">.</span>
            </h1>
            <p className="mx-auto mt-4.5 max-w-xl text-base leading-relaxed text-muted-foreground lg:mx-0">
              Connect {SITE_NAME} to Claude, ChatGPT or any MCP-compatible assistant. Send a photo of the receipt, say who had what, and the split lands in your trip - tax, service and discounts shared fairly.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
              <a href="#connect" className={buttonVariants({ size: "lg", className: "font-bold" })}>Connect your assistant</a>
              <Link href="/register" className={buttonVariants({ size: "lg", variant: "outline", className: "font-bold" })}>Create a free account</Link>
            </div>
          </div>
          <ChatDemo />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 md:px-10">
        <h2 className="text-center font-heading text-2xl font-extrabold">Just ask</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">Everything you&apos;d tap through in the app, in one sentence.</p>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {asks.map(({ icon: Icon, title: askTitle, prompt }) => (
            <div key={askTitle} className="rounded-2xl border border-border bg-card p-5">
              <span className="grid size-9 place-items-center rounded-[10px] bg-accent text-accent-foreground"><Icon className="size-[18px]" /></span>
              <h3 className="mt-3 font-heading text-base font-extrabold">{askTitle}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{prompt}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="connect" className="scroll-mt-20 border-t border-border bg-muted/40 px-6 py-16 md:px-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-heading text-2xl font-extrabold">Connect in two minutes</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
            You&apos;ll need a {SITE_NAME} account. Copy this server URL, then follow the steps for your assistant.
          </p>
          <div className="mx-auto mt-6 max-w-md">
            <p className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Server URL</p>
            <McpUrlField className="bg-white" />
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {clients.map((client) => (
              <div key={client.name} className="rounded-2xl border border-border bg-card p-5.5">
                <h3 className="font-heading text-lg font-extrabold">{client.name}</h3>
                <ol className="mt-3 space-y-3">
                  {client.steps.map((step, index) => (
                    <li key={step} className="flex gap-3 text-sm leading-relaxed">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Menu names change between app versions and plans. If yours look different, look for “connectors”, “integrations” or “MCP servers”.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 md:px-10">
        <div className="flex flex-col items-center text-center">
          <span className="grid size-10 place-items-center rounded-full bg-success/10 text-success"><ShieldCheckIcon className="size-5" /></span>
          <h2 className="mt-3 font-heading text-2xl font-extrabold">You stay in control</h2>
        </div>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {safety.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-heading text-base font-extrabold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border px-6 py-16 md:px-10">
        <h2 className="mb-10 text-center font-heading text-2xl font-extrabold">Questions</h2>
        <div className="mx-auto max-w-3xl space-y-6">
          {faqs.map(({ question, answer }) => (
            <div key={question}>
              <h3 className="font-heading text-base font-bold">{question}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-16 md:px-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center rounded-[20px] bg-[oklch(0.24_0.045_255)] px-6 py-10 text-center text-white">
          <h2 className="font-heading text-2xl font-extrabold">Your next bill can split itself</h2>
          <p className="mt-2 max-w-md text-sm text-white/75">Connect once, then just send the photo.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href="#connect" className={buttonVariants({ size: "lg", variant: "secondary", className: "font-bold" })}>Set it up <ArrowRightIcon className="size-4" /></a>
            <Link href="/trips" className="inline-flex h-10 items-center px-3 text-sm font-bold text-white/85 hover:text-white">Go to my trips</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-6 text-center">
        <p className="text-[13px] text-muted-foreground">© {new Date().getFullYear()} {SITE_NAME} · <Link href="/" className="hover:underline">Home</Link></p>
      </footer>
    </div>
  )
}
