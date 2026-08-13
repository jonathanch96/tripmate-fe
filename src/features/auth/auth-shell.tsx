import type { ReactNode } from "react"
import Link from "next/link"

import { BrandMark } from "@/components/layout/brand-mark"

export function AuthShell({ title, description, alternate, children }: {
  title: string
  description: string
  alternate: ReactNode
  children: ReactNode
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(320px,42%)_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[oklch(0.24_0.045_255)] p-14 text-white lg:flex">
        <div className="absolute -top-[140px] -right-[140px] size-[420px] rounded-full bg-[oklch(0.4_0.1_255_/_0.35)]" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 size-[280px] -translate-x-1/5 translate-y-1/5 rounded-full bg-[oklch(0.5_0.12_150_/_0.18)]" aria-hidden="true" />
        <Link href="/" className="relative flex items-center gap-2.5">
          <BrandMark inverse />
          <span className="font-heading text-xl font-extrabold">TripMate</span>
        </Link>
        <div className="relative max-w-[400px]">
          <h1 className="font-heading text-[38px] leading-[1.15] font-extrabold">
            Travel together.
            <br />
            Split easily.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/80">
            Track shared expenses across currencies, split any way you like, and always know who owes who.
          </p>
        </div>
        <p className="relative text-[13px] text-white/50">© {new Date().getFullYear()} TripMate</p>
      </div>
      <div className="flex w-full flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          <Link href="/" className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <BrandMark />
            <span className="font-heading text-xl font-extrabold">TripMate</span>
          </Link>
          <h2 className="font-heading text-[26px] font-extrabold">{title}</h2>
          <p className="mt-1.5 mb-7 text-sm text-muted-foreground">{description}</p>
          {children}
          <p className="mt-5 text-center text-sm text-muted-foreground">{alternate}</p>
        </div>
      </div>
    </main>
  )
}
