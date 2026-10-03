import { CheckIcon, ImageIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

function Bubble({ from, children }: { from: "user" | "assistant"; children: ReactNode }) {
  return (
    <div className={cn("flex", from === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-[16px] px-3.5 py-2.5 text-[13px] leading-relaxed",
          from === "user" ? "rounded-br-[4px] bg-primary text-primary-foreground" : "rounded-bl-[4px] border border-border bg-white text-foreground",
        )}
      >
        {children}
      </div>
    </div>
  )
}

const items = [
  { n: 1, name: "Nasi goreng", price: "45,000" },
  { n: 2, name: "Mie goreng", price: "40,000" },
  { n: 3, name: "Es teh ×3", price: "30,000" },
]

const shares = [
  { name: "You", total: "58,467" },
  { name: "Budi", total: "53,152" },
  { name: "Carol", total: "10,631" },
]

// A static, illustrative conversation: what splitting a bill through an AI assistant looks like.
export function ChatDemo({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[18px] border border-border bg-muted/60 text-left shadow-[0_30px_70px_-15px_oklch(0.3_0.05_255_/_0.25)]", className)}>
      <div className="flex items-center gap-2 border-b border-border bg-white/70 px-4 py-3">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-success/60" />
        <span className="ml-2 text-xs font-bold text-muted-foreground">Your AI assistant · TripMate connected</span>
      </div>
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <Bubble from="user">
          <span className="mb-2 flex items-center gap-2 rounded-[10px] bg-white/15 px-2.5 py-2 text-xs font-semibold">
            <ImageIcon className="size-4" /> warung-made-receipt.jpg
          </span>
          Split this for our Bali trip
        </Bubble>
        <Bubble from="assistant">
          <p>Found it - this goes on <strong>Bali 2026</strong>. Here&apos;s the bill:</p>
          <ul className="my-2 space-y-0.5 tabular-nums">
            {items.map((item) => (
              <li key={item.n} className="flex justify-between gap-6"><span>{item.n}. {item.name}</span><span>{item.price}</span></li>
            ))}
          </ul>
          <p className="text-muted-foreground">+ tax 11,500 · service 5,750 · discount −10,000</p>
          <p className="mt-2">Who had what? On the trip: you, Budi, Carol.</p>
        </Bubble>
        <Bubble from="user">1 me, 2 Budi, 3 all of us. I paid.</Bubble>
        <Bubble from="assistant">
          <p>Each person&apos;s share, tax, service and discount included:</p>
          <ul className="my-2 space-y-0.5 tabular-nums">
            {shares.map((share) => (
              <li key={share.name} className="flex justify-between gap-6"><span>{share.name}</span><span className="font-bold">IDR {share.total}</span></li>
            ))}
          </ul>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">
            <CheckIcon className="size-3.5" /> Saved to TripMate
          </p>
        </Bubble>
      </div>
    </div>
  )
}
