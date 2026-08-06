"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      <div className="mb-6 flex justify-between">
        <h1 className="text-3xl font-semibold">My trips</h1>
        <Button render={<Link href="/trip/create" />}>Create trip</Button>
      </div>
      {invitations.data?.length ? (
        <Card className="mb-6">
          <CardHeader><CardTitle>You were invited</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {invitations.data.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between">
                <span>{invitation.email}</span>
                <Button
                  size="sm"
                  disabled={accept.isPending}
                  onClick={() => accept.mutate(invitation.token)}
                >
                  Accept
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {trips.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {trips.data.map((trip) => (
            <Link key={trip.id} href={`/trip/${trip.code}`}>
              <Card>
                <CardHeader><CardTitle>{trip.name}</CardTitle></CardHeader>
                <CardContent>{trip.startDate} — {trip.endDate} · {trip.baseCurrency}</CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border p-10 text-center text-muted-foreground">
          No trips yet. Create one to get started.
        </p>
      )}
    </section>
  )
}
