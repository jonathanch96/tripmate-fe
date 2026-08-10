"use client"

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import Decimal from "decimal.js"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { BalanceResult } from "@/features/finance/types"
import { CreateTripDialog } from "@/features/trip/create-trip-dialog"
import type { Invitation, Participant, Trip } from "@/features/trip/types"
import { apiFetch } from "@/lib/api-client"
import { avatarColorFor, initialsOf } from "@/lib/avatar-colors"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

export default function TripsPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const trips = useQuery({
    queryKey: qk.trips(),
    queryFn: async () => (await apiFetch<Trip[]>("/api/trips")).data ?? [],
  })
  const invitations = useQuery({
    queryKey: qk.myInvitations(),
    queryFn: async () => (await apiFetch<Invitation[]>("/api/invitations/me")).data ?? [],
  })
  const participantQueries = useQueries({ queries: (trips.data ?? []).map((trip) => ({
    queryKey: qk.participants(trip.code),
    queryFn: async () => (await apiFetch<Participant[]>(`/api/trips/${trip.code}/participants`)).data ?? [],
  })) })
  const balanceQueries = useQueries({ queries: (trips.data ?? []).map((trip) => ({
    queryKey: qk.balances(trip.code),
    queryFn: async () => (await apiFetch<BalanceResult>(`/api/trips/${trip.code}/balances`)).data!,
  })) })
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
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[28px] font-extrabold">My trips</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Pick a trip to see expenses and balances.</p>
        </div>
        <CreateTripDialog />
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
                  Accept
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {trips.data?.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trips.data.map((trip, index) => {
            const members = participantQueries[index]?.data ?? []
            const ownBalance = balanceQueries[index]?.data?.balances.find((row) => row.user.email === session?.user?.email)
            const value = new Decimal(ownBalance?.netBalance ?? 0)
            const digits = ["IDR", "JPY", "KRW", "VND"].includes(trip.baseCurrency.toUpperCase()) ? 0 : 2
            const amount = value.abs().toDecimalPlaces(digits).toNumber().toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
            const balanceLabel = value.isPositive() ? `You are owed ${trip.baseCurrency} ${amount}` : value.isNegative() ? `You owe ${trip.baseCurrency} ${amount}` : "Settled up"
            return (
            <Link key={trip.id} href={`/trip/${trip.code}`} className="block">
              <Card className="h-full rounded-2xl py-6 transition-shadow hover:shadow-[0_8px_24px_oklch(0.2_0.02_60/0.08)]">
                <CardHeader className="px-6"><div className="flex items-start justify-between gap-4"><div><CardTitle className="font-heading text-lg font-extrabold">{trip.name}</CardTitle><p className="mt-1 font-mono text-xs text-muted-foreground">{trip.code}</p></div><span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">{trip.baseCurrency}</span></div></CardHeader>
                <CardContent className="space-y-4 px-6 text-sm text-muted-foreground">
                  <AvatarGroup>{members.slice(0, 4).map((participant) => { const name = participant.user?.name ?? participant.user?.email ?? "Participant"; return <Avatar key={participant.id} size="sm" title={name}><AvatarFallback className={avatarColorFor(name)}>{initialsOf(name)}</AvatarFallback></Avatar> })}{members.length > 4 ? <AvatarGroupCount className="size-8 text-xs">+{members.length - 4}</AvatarGroupCount> : null}</AvatarGroup>
                  <span className={cn("inline-flex rounded-[9px] px-3 py-2 text-[13px] font-bold", value.isPositive() ? "bg-emerald-50 text-emerald-700" : value.isNegative() ? "bg-red-50 text-red-700" : "bg-muted text-muted-foreground")}>{balanceQueries[index]?.isLoading ? `${trip.startDate} — ${trip.endDate}` : balanceLabel}</span>
                </CardContent>
              </Card>
            </Link>
          )})}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed p-16 text-center">
          <p className="font-bold">No trips yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first trip to start tracking shared costs.</p>
          <div className="mt-5"><CreateTripDialog /></div>
        </div>
      )}
    </section>
  )
}
