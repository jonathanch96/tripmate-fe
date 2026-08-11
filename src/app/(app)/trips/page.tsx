"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingState, Spinner } from "@/components/ui/spinner"
import type { Invitation, Trip } from "@/features/trip/types"
import { apiFetch } from "@/lib/api-client"
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
    onError: () => toast.error("Could not accept invitation"),
  })

  return (
    <section>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-semibold">My trips</h1>
        <Link href="/trip/create" className={buttonVariants()}>Create trip</Link>
      </div>
      {invitations.data?.length ? (
        <Card className="mb-6 border-primary/20 bg-primary/5">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trips.data.map((trip) => (
            <Link key={trip.id} href={`/trip/${trip.code}`} className="block">
              <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/30">
                <CardHeader><CardTitle className="font-heading">{trip.name}</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {trip.startDate} — {trip.endDate} · {trip.baseCurrency}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <p>No trips yet. Create one to get started.</p>
        </div>
      )}
    </section>
  )
}
