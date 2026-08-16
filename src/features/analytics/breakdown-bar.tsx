// One row of a "cost by X" breakdown list - shared by the cross-trip Analytics page (category,
// country) and the per-trip Analytics tab (category, person), so the four lists render identically.
export function BreakdownBar({
  icon,
  label,
  amountLabel,
  pctLabel,
  fraction,
}: {
  icon?: string
  label: string
  amountLabel: string
  pctLabel: string
  fraction: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-3.5 border-b border-[oklch(0.95_0.006_60)] py-3.5 last:border-0">
      {icon ? <span className="w-6 shrink-0 text-sm">{icon}</span> : null}
      <span className="w-35 shrink-0 truncate text-sm font-semibold">{label}</span>
      <div className="h-2 min-w-20 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.max(3, Math.round(Math.min(1, Math.max(0, fraction)) * 100))}%` }}
        />
      </div>
      <span className="w-28 shrink-0 text-right text-[13px] font-bold tabular-nums">{amountLabel}</span>
      <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">{pctLabel}</span>
    </div>
  )
}
