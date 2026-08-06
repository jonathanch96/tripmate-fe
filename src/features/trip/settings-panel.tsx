"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  participantBankSchema,
  participantUpdateSchema,
  tripUpdateSchema,
  type ParticipantBankInput,
  type TripUpdateInput,
} from "@/features/trip/schema"
import { useTrip } from "@/features/trip/trip-context"
import type { Participant, Trip } from "@/features/trip/types"
import { apiFetch } from "@/lib/api-client"
import { ApiError } from "@/lib/envelope"
import { qk } from "@/lib/query-keys"

const booleanSettings = [
  ["approvalRequiredExpenses", "Require expense approval"],
  ["approvalRequiredSettlements", "Require settlement approval"],
  ["multiCurrencyEnabled", "Enable multiple currencies"],
  ["allowSettlementBeforeEnd", "Allow settlement before trip ends"],
] as const

function settingsPayload(trip: Trip): TripUpdateInput {
  return tripUpdateSchema.parse({
    name: trip.name,
    baseCurrency: trip.baseCurrency,
    editPermission: trip.settings.editPermission,
    approvalRequiredExpenses: trip.settings.approvalRequiredExpenses,
    approvalRequiredSettlements: trip.settings.approvalRequiredSettlements,
    multiCurrencyEnabled: trip.settings.multiCurrencyEnabled,
    allowSettlementBeforeEnd: trip.settings.allowSettlementBeforeEnd,
    version: trip.version,
  })
}

function BankEditor({
  code,
  participant,
  onClose,
}: {
  code: string
  participant: Participant
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const form = useForm<ParticipantBankInput>({
    resolver: zodResolver(participantBankSchema),
    defaultValues: participant.bankInfo ?? { bankName: "", accountNumber: "", accountHolder: "" },
  })
  const mutation = useMutation({
    mutationFn: async (bankInfo: ParticipantBankInput) => {
      const body = participantUpdateSchema.parse({ bankInfo })
      const response = await apiFetch<Participant>(
        `/api/trips/${code}/participants/${participant.id}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      )
      if (!response.data) throw new Error("The participant response was empty")
      return response.data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Participant[]>(qk.participants(code), (current = []) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      toast.success("Bank details updated")
      onClose()
    },
    onError: () => toast.error("Could not update bank details"),
  })

  return (
    <form className="mt-3 grid gap-2 rounded-lg border p-3 md:grid-cols-4" onSubmit={form.handleSubmit((value) => mutation.mutate(value))}>
      <Input aria-label="Bank name" placeholder="Bank name" {...form.register("bankName")} />
      <Input aria-label="Account number" placeholder="Account number" {...form.register("accountNumber")} />
      <Input aria-label="Account holder" placeholder="Account holder" {...form.register("accountHolder")} />
      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>Save</Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

export function SettingsPanel() {
  const initial = useTrip()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState("")
  const [link, setLink] = useState("")
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null)

  const tripQuery = useQuery({
    queryKey: qk.trip(initial.trip.code),
    initialData: initial.trip,
    staleTime: Infinity,
    queryFn: async () => (await apiFetch<Trip>(`/api/trips/${initial.trip.code}`)).data ?? initial.trip,
  })
  const participantsQuery = useQuery({
    queryKey: qk.participants(initial.trip.code),
    initialData: initial.participants,
    staleTime: Infinity,
    queryFn: async () =>
      (await apiFetch<Participant[]>(`/api/trips/${initial.trip.code}/participants`)).data ?? [],
  })
  const trip = tripQuery.data

  const settingsMutation = useMutation({
    mutationFn: async (payload: TripUpdateInput) => {
      const response = await apiFetch<Trip>(`/api/trips/${trip.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.data) throw new Error("The trip response was empty")
      return response.data
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: qk.trip(trip.code) })
      const previous = queryClient.getQueryData<Trip>(qk.trip(trip.code))
      queryClient.setQueryData<Trip>(qk.trip(trip.code), (current) =>
        current
          ? {
              ...current,
              name: payload.name,
              baseCurrency: payload.baseCurrency,
              settings: {
                editPermission: payload.editPermission,
                approvalRequiredExpenses: payload.approvalRequiredExpenses,
                approvalRequiredSettlements: payload.approvalRequiredSettlements,
                multiCurrencyEnabled: payload.multiCurrencyEnabled,
                allowSettlementBeforeEnd: payload.allowSettlementBeforeEnd,
              },
            }
          : current,
      )
      return { previous }
    },
    onSuccess: (updated) => queryClient.setQueryData(qk.trip(updated.code), updated),
    onError: (error, _payload, context) => {
      if (context?.previous) queryClient.setQueryData(qk.trip(trip.code), context.previous)
      if (error instanceof ApiError && error.envelope.code === "CONCURRENT_MODIFICATION") {
        toast.error("Someone else changed these settings. The latest version has been loaded.")
        void queryClient.invalidateQueries({ queryKey: qk.trip(trip.code) })
      } else {
        toast.error("Could not update settings")
      }
    },
  })

  function updateSettings(change: Partial<Trip["settings"]>) {
    settingsMutation.mutate(
      settingsPayload({ ...trip, settings: { ...trip.settings, ...change } }),
    )
  }

  const invitationMutation = useMutation({
    mutationFn: async () =>
      apiFetch<{ status: string; inviteLink?: string }>(`/api/trips/${trip.code}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }),
    onSuccess: (response) => {
      if (response.data?.inviteLink) setLink(`${location.origin}${response.data.inviteLink}`)
      toast.success(response.data?.status === "added" ? "Participant added" : "Invitation created")
      void queryClient.invalidateQueries({ queryKey: qk.invitations(trip.code) })
    },
    onError: () => toast.error("Could not create invitation"),
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Share trip</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input readOnly value={trip.code} />
          <Button onClick={() => navigator.clipboard.writeText(`${location.origin}/trip/${trip.code}`)}>Copy link</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center justify-between gap-4">
            <span>Edit permission</span>
            <NativeSelect
              aria-label="Edit permission"
              disabled={!trip.canEditSettings || settingsMutation.isPending}
              value={trip.settings.editPermission}
              onChange={(event) => updateSettings({ editPermission: event.target.value as Trip["settings"]["editPermission"] })}
            >
              <NativeSelectOption value="everyone">Everyone</NativeSelectOption>
              <NativeSelectOption value="own_only">Own entries only</NativeSelectOption>
            </NativeSelect>
          </label>
          {booleanSettings.map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-4">
              <span>{label}</span>
              <input
                aria-label={label}
                type="checkbox"
                checked={trip.settings[key]}
                disabled={!trip.canEditSettings || settingsMutation.isPending}
                onChange={() => updateSettings({ [key]: !trip.settings[key] })}
              />
            </label>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Participants</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {participantsQuery.data.map((participant) => {
            const name = participant.user?.name ?? participant.user?.email ?? "Participant"
            const mayEditBank = trip.canEditSettings || participant.userId === session?.user?.id
            return (
              <div key={participant.id} className="border-b pb-3">
                <div className="flex items-center justify-between gap-4">
                  <span>{name} <span className="text-muted-foreground">{participant.user?.email}</span></span>
                  <span className="flex items-center gap-2">
                    <Badge>{participant.role}</Badge>
                    {participant.bankInfo?.accountNumber ?? "No bank details"}
                    {mayEditBank ? (
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Edit bank details for ${name}`}
                        onClick={() => setEditingParticipant(participant.id)}
                      >
                        Edit bank
                      </Button>
                    ) : null}
                  </span>
                </div>
                {editingParticipant === participant.id ? (
                  <BankEditor code={trip.code} participant={participant} onClose={() => setEditingParticipant(null)} />
                ) : null}
              </div>
            )
          })}
        </CardContent>
      </Card>
      {trip.canEditSettings ? (
        <Card>
          <CardHeader><CardTitle>Invite someone</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="friend@example.com" />
              <Button disabled={invitationMutation.isPending} onClick={() => invitationMutation.mutate()}>Invite</Button>
            </div>
            {link ? (
              <>
                <p className="text-sm">Email delivery lands in a later release — share this link directly.</p>
                <Input readOnly value={link} />
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
