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
        <div className="absolute -top-[140px] -right-[140px] size-[420px] rounded-full bg-[oklch(0.4_0.1_255/0.35)]" aria-hidden="true" />
        <div className="absolute -bottom-20 -left-16 size-[280px] rounded-full bg-[oklch(0.5_0.12_150/0.18)]" aria-hidden="true" />
        <Link href="/" className="relative flex items-center gap-2.5 font-heading text-xl font-extrabold tracking-tight">
          <BrandMark inverse className="size-[34px] rounded-[10px] [&>span]:inset-2" />
          <span>TripMate</span>
        </Link>
        <div className="relative max-w-[400px]">
          <p className="font-heading text-[38px] leading-[1.15] font-extrabold">Travel together.<br />Split easily.</p>
          <p className="mt-4 text-[15px] leading-relaxed text-white/75">Track shared expenses across currencies, split any way you like, and always know who owes who.</p>
        </div>
        <p className="relative text-[13px] text-white/45">© 2026 TripMate</p>
      </div>
      <div className="flex items-center justify-center px-5 py-12 sm:px-12">
        <div className="w-full max-w-[380px]">
          <Link href="/" className="mb-10 flex items-center justify-center gap-2 font-heading text-2xl font-extrabold tracking-tight lg:hidden">
            <BrandMark className="size-8" />
            <span>TripMate</span>
          </Link>
          <h1 className="font-heading text-[26px] font-extrabold">{title}</h1>
          <p className="mb-7 mt-1.5 text-sm text-muted-foreground">{description}</p>
          {children}
          <p className="mt-5 text-center text-[13px] text-muted-foreground">{alternate}</p>
        </div>
      </div>
    </main>
  )
}
