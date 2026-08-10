import { cn } from "@/lib/utils"

export function BrandMark({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  return (
    <span
      className={cn("relative inline-block size-[30px] shrink-0 rounded-[9px] bg-primary", inverse && "bg-[oklch(0.7_0.16_150)]", className)}
      aria-hidden="true"
    >
      <span className={cn("absolute inset-[7px] rounded-full bg-white", inverse && "bg-[oklch(0.98_0.006_60)]")} />
    </span>
  )
}
