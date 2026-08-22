"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PlusIcon, SearchIcon } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LoadingState, Spinner } from "@/components/ui/spinner"
import type { Invitation, Trip } from "@/features/trip/types"
import { apiFetch } from "@/lib/api-client"
import { avatarColorFor, initialsOf } from "@/lib/avatar-colors"
import { apiErrorMessage } from "@/lib/envelope"
import { formatMoney } from "@/lib/money"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

export default function TripsPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [view, setView] = useState<"active" | "archived">("active")
  const activeTrips = useQuery({
    queryKey: qk.tripsByArchived(false),
    queryFn: async () => (await apiFetch<Trip[]>("/api/trips?archived=false")).data ?? [],
  })
  const archivedTrips = useQuery({
    queryKey: qk.tripsByArchived(true),
    queryFn: async () => (await apiFetch<Trip[]>("/api/trips?archived=true")).data ?? [],
  })
  const trips = view === "archived" ? archivedTrips : activeTrips
  const query = search.trim().toLowerCase()
  const visibleTrips = query
    ? trips.data?.filter((trip) => `${trip.name} ${trip.code} ${trip.country ?? ""}`.toLowerCase().includes(query))
    : trips.data
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
  const archiveMutation = useMutation({
    mutationFn: ({ code, archived }: { code: string; archived: boolean }) =>
      apiFetch(`/api/trips/${code}/${archived ? "archive" : "unarchive"}`, { method: "POST" }),
    onSuccess: async (_data, variables) => {
      toast.success(variables.archived ? "Trip archived" : "Trip restored")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.tripsByArchived(false) }),
        queryClient.invalidateQueries({ queryKey: qk.tripsByArchived(true) }),
      ])
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not update the trip")),
  })
  const userName = session?.user?.name || session?.user?.email || "Traveler"

  return (
    <section>
      <div className="mb-6 flex items-center justify-between md:hidden">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Good to see you</p>
          <h1 className="mt-0.5 font-heading text-[28px] font-extrabold">Your trips</h1>
        </div>
        <Link href="/account" aria-label="Open account" className={`grid size-11 place-items-center rounded-full text-sm font-extrabold ${avatarColorFor(userName)}`}>
          {initialsOf(userName)}
        </Link>
      </div>
      <div className="mb-7 hidden flex-wrap items-end justify-between gap-3.5 md:flex">
        <div>
          <h1 className="font-heading text-[28px] font-extrabold">My trips</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Pick a trip to see expenses and balances.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/analytics" className={buttonVariants({ variant: "outline", className: "font-bold" })}>📊 Analytics</Link>
          <Link href="/trip/create" className={buttonVariants({ className: "font-bold" })}>+ Create trip</Link>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 rounded-[12px] bg-muted p-1 md:flex md:flex-wrap md:bg-transparent md:p-0">
        <button
          type="button"
          onClick={() => setView("active")}
          className={cn(
            "rounded-[9px] px-4 py-2.5 text-[13px] font-bold",
            view === "active" ? "bg-white text-foreground shadow-sm md:bg-accent md:text-accent-foreground md:shadow-none" : "text-muted-foreground md:bg-muted"
          )}
        >
          Active trips · {activeTrips.data?.length ?? 0}
        </button>
        <button
          type="button"
          onClick={() => setView("archived")}
          className={cn(
            "rounded-[9px] px-4 py-2.5 text-[13px] font-bold",
            view === "archived" ? "bg-white text-foreground shadow-sm md:bg-accent md:text-accent-foreground md:shadow-none" : "text-muted-foreground md:bg-muted"
          )}
        >
          Archived · {archivedTrips.data?.length ?? 0}
        </button>
      </div>

      {trips.data?.length ? (
        <div className="relative mb-5 max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search trips"
            className="h-12 rounded-[12px] bg-white pl-10 md:h-9"
            aria-label="Search trips"
          />
        </div>
      ) : null}
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
      ) : visibleTrips?.length ? (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] md:gap-5">
          {visibleTrips.map((trip) => (
            <Card key={trip.id} className="h-full gap-0 rounded-[18px] p-5 shadow-none transition-shadow hover:shadow-[0_8px_24px_oklch(0.2_0.02_60_/_0.08)] md:rounded-2xl md:p-6">
              <Link href={`/trip/${trip.code}`} className="block">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading text-lg font-extrabold">{trip.name}</h3>
                    <span className="text-xs tracking-wide text-muted-foreground">{trip.code}</span>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {trip.isArchived ? (
                      <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">Archived</span>
                    ) : null}
                    {trip.country ? (
                      <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                        {trip.country}
                      </span>
                    ) : null}
                    {(trip.currencies?.length ? trip.currencies : [trip.baseCurrency]).map((code) => (
                      <span key={code} className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-5 text-[13px] text-muted-foreground md:mt-4 md:text-sm">
                  {trip.startDate} — {trip.endDate}
                </p>
                <p className="mt-1.5 text-[13px] text-muted-foreground md:text-sm">
                  {trip.memberCount ?? 0} member{trip.memberCount === 1 ? "" : "s"} · Total {formatMoney(trip.totalSpend ?? "0", trip.baseCurrency)}
                </p>
              </Link>
              <div className="mt-3.5 flex justify-end border-t border-border pt-3.5">
                {trip.isArchived ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={archiveMutation.isPending}
                    onClick={() => archiveMutation.mutate({ code: trip.code, archived: false })}
                  >
                    ↺ Restore trip
                  </Button>
                ) : (
                  <button
                    type="button"
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
                    disabled={archiveMutation.isPending}
                    onClick={() => archiveMutation.mutate({ code: trip.code, archived: true })}
                  >
                    Archive trip
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : trips.data?.length ? (
        <div className="rounded-2xl border-[1.5px] border-dashed border-border px-6 py-16 text-center">
          <p className="mb-1.5 text-[15px] font-bold">No trips match &ldquo;{search}&rdquo;</p>
          <p className="text-[13px] text-muted-foreground">Try a different name, code, or country.</p>
        </div>
      ) : view === "archived" ? (
        <div className="rounded-2xl border-[1.5px] border-dashed border-border px-6 py-16 text-center">
          <p className="mb-1.5 text-[15px] font-bold">No archived trips</p>
          <p className="text-[13px] text-muted-foreground">Trips you archive will show up here.</p>
        </div>
      ) : (
        <div className="rounded-2xl border-[1.5px] border-dashed border-border px-6 py-16 text-center">
          <p className="mb-1.5 text-[15px] font-bold">No trips yet</p>
          <p className="mb-4.5 text-[13px] text-muted-foreground">Create your first trip to start tracking shared costs.</p>
          <Link href="/trip/create" className={buttonVariants({ className: "font-bold" })}>+ Create trip</Link>
        </div>
      )}
      <Link
        href="/trip/create"
        className="fixed right-5 bottom-[84px] z-40 flex h-14 items-center gap-2 rounded-[18px] bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-[0_10px_30px_oklch(0.35_0.12_250_/_0.28)] md:hidden"
      >
        <PlusIcon className="size-5" /> New trip
      </Link>
    </section>
  )
}
