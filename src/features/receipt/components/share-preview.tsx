import type { ShareBreakdown } from "@/features/receipt/types"
import type { Participant } from "@/features/trip/types"

export function SharePreview({ shares, participants, loading }: { shares: ShareBreakdown | null; participants: Participant[]; loading: boolean }) {
  if (loading) return <p className="text-sm text-muted-foreground">Updating server-calculated shares…</p>
  if (!shares) return null
  const participantName = (id: string) => participants.find((value) => value.userId === id)?.user?.name ?? participants.find((value) => value.userId === id)?.user?.email ?? "Participant"
  return <section className="space-y-2"><div><h3 className="font-medium">Share preview</h3><p className="text-xs text-muted-foreground">Calculated by the server, including proportional tax and service.</p></div><div className="rounded-md border"><div className="grid grid-cols-[1fr_repeat(4,minmax(4rem,auto))] gap-2 bg-muted/50 p-2 text-xs font-medium"><span>Person</span><span>Items</span><span>Tax</span><span>Service</span><span>Total</span></div>{shares.perUser.map((row) => <div className="grid grid-cols-[1fr_repeat(4,minmax(4rem,auto))] gap-2 border-t p-2 text-sm" key={row.userId}><span className="truncate font-medium">{participantName(row.userId)}</span><span>{row.itemsSubtotal}</span><span>{row.tax}</span><span>{row.serviceCharge}</span><span className="font-medium">{row.total}</span></div>)}</div>{shares.unassignedItems.length ? <p className="text-sm text-destructive">Assign every red item before converting this receipt.</p> : null}{shares.discrepancy ? <p className="text-sm text-amber-600">The line items do not match the printed subtotal. Conversion uses the item assignments shown here.</p> : null}</section>
}
