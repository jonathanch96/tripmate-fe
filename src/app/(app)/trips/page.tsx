"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingState, Spinner } from "@/components/ui/spinner"
import type { Invitation, Trip } from "@/features/trip/types"
import { apiFetch } from "@/lib/api-client"
import { apiErrorMessage } from "@/lib/envelope"
import { qk } from "@/lib/query-keys"

export default function TripsPage() {
  const queryClient = useQueryClient()
  const trips = useQuery({
    queryKey: qk.trips(),
    queryFn: async () => (await apiFetch<Trip[]>("/api/trips")).data ?? [],
  })
  const invitations = useQuery({
    queryKey: qk.myInvitations(),
    queryFn: async () => (await apiFetch<Invitation[]>("/api/invitations/me")).data ?? [],
  })
  const accept = useMutation({
    mutationFn: (token: string) => apiFetch(`/api/invitations/${token}/accept`, { method: "POST" }),
    onSuccess: async () => {
      toast.success("Invitation accepted")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.trips() }),
        queryClient.invalidateQueries({ queryKey: qk.myInvitations() }),
      ])
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not accept invitation")),
  })

  return (
    <section>
      <div className="mb-7 flex items-end justify-between">
        <div>
          <h1 className="font-heading text-[28px] font-extrabold">My trips</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Pick a trip to see expenses and balances.</p>
        </div>
        <Link href="/trip/create" className={buttonVariants({ className: "font-bold" })}>+ Create trip</Link>
      </div>
      {invitations.data?.length ? (
        <Card className="mb-6 border-primary/20 bg-accent/40">
          <CardHeader><CardTitle className="text-base">You were invited</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {invitations.data.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between">
                <span className="text-sm">{invitation.email}</span>
                <Button
                  size="sm"
                  disabled={accept.isPending}
                  onClick={() => accept.mutate(invitation.token)}
                >
                  {accept.isPending ? <Spinner /> : "Accept"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {trips.isLoading ? (
        <LoadingState label="Loading your trips…" className="justify-center" />
      ) : trips.data?.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
          {trips.data.map((trip) => (
            <Link key={trip.id} href={`/trip/${trip.code}`} className="block">
              <Card className="h-full gap-0 rounded-2xl p-6 shadow-none transition-shadow hover:shadow-[0_8px_24px_oklch(0.2_0.02_60_/_0.08)]">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading text-lg font-extrabold">{trip.name}</h3>
                    <span className="text-xs tracking-wide text-muted-foreground">{trip.code}</span>
                  </div>
                  <span className="shrink-0 rounded-md bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                    {trip.baseCurrency}
                  </span>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {trip.startDate} — {trip.endDate}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border-[1.5px] border-dashed border-border px-6 py-16 text-center">
          <p className="mb-1.5 text-[15px] font-bold">No trips yet</p>
          <p className="mb-4.5 text-[13px] text-muted-foreground">Create your first trip to start tracking shared costs.</p>
          <Link href="/trip/create" className={buttonVariants({ className: "font-bold" })}>+ Create trip</Link>
        </div>
      )}
    </section>
  )
}
