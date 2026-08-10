"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import {
  ArrowLeft,
  Coins,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Users,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import {
  createExpenseCategory,
  deleteExpenseCategory,
  listExpenseCategories,
} from "@/features/expense/category-api"
import { ExchangeRateManager } from "@/features/finance/exchange-rate-manager"
import {
  participantBankSchema,
  participantUpdateSchema,
  tripUpdateSchema,
  type ParticipantBankInput,
  type TripUpdateInput,
} from "@/features/trip/schema"
import { useTrip } from "@/features/trip/trip-context"
import type { Invitation, Participant, Trip } from "@/features/trip/types"
import { categoryColorFor } from "@/lib/category-colors"
import { apiFetch } from "@/lib/api-client"
import { ApiError } from "@/lib/envelope"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

const booleanSettings = [
  ["approvalRequiredExpenses", "Require expense approval"],
  ["approvalRequiredSettlements", "Require settlement approval"],
  ["multiCurrencyEnabled", "Enable multiple currencies"],
  ["allowSettlementBeforeEnd", "Allow settlement before trip ends"],
] as const

function roleLabel(role: Participant["role"]) {
  return role === "planner" ? "Owner" : "Member"
}

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
  const hasMaskedAccount = /^[•*]+/.test(participant.bankInfo?.accountNumber ?? "")
  const form = useForm<ParticipantBankInput>({
    resolver: zodResolver(participantBankSchema),
    defaultValues: participant.bankInfo
      ? { ...participant.bankInfo, accountNumber: hasMaskedAccount ? "" : participant.bankInfo.accountNumber }
      : { bankName: "", accountNumber: "", accountHolder: "" },
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
    <form className="mt-3 grid gap-2 rounded-lg border p-3 md:grid-cols-4" method="post" onSubmit={form.handleSubmit((value) => mutation.mutate(value))}>
      <Input aria-label="Bank name" placeholder="Bank name" {...form.register("bankName")} />
      <Input
        aria-label="Account number"
        placeholder={hasMaskedAccount ? "Enter a new account number to replace the masked value" : "Account number"}
        {...form.register("accountNumber")}
      />
      <Input aria-label="Account holder" placeholder="Account holder" {...form.register("accountHolder")} />
      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>Save</Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
      {form.formState.errors.accountNumber ? (
        <p role="alert" className="text-sm text-destructive md:col-span-4">
          {form.formState.errors.accountNumber.message}
        </p>
      ) : null}
    </form>
  )
}

type Section = "menu" | "currencies" | "categories" | "roles" | "members" | "preferences"

const MENU_ITEMS: Array<{ id: Section; label: string; description: string; icon: typeof Coins }> = [
  { id: "currencies", label: "Currencies & exchange rates", description: "Base currency and rates between currencies used on this trip.", icon: Coins },
  { id: "categories", label: "Categories", description: "The categories expenses can be tagged with.", icon: Tag },
  { id: "roles", label: "Roles & permissions", description: "What owners and members can each do.", icon: ShieldCheck },
  { id: "members", label: "Members & invites", description: "Who's on this trip, bank details, and pending invites.", icon: Users },
  { id: "preferences", label: "Trip preferences", description: "Approval requirements and editing rules.", icon: SlidersHorizontal },
]

function SectionHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div>
      <button type="button" className="mb-5 inline-flex items-center gap-1 text-[13px] font-semibold text-primary" onClick={onBack}>
        <ArrowLeft className="size-3.5" aria-hidden="true" /> Settings
      </button>
      <h1 className="font-heading text-[22px] font-extrabold">{title}</h1>
    </div>
  )
}

function SettingsMenu({ onSelect }: { onSelect: (section: Section) => void }) {
  return (
    <div className="flex max-w-[520px] flex-col gap-2.5">
      {MENU_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className="flex items-center justify-between rounded-[14px] border bg-white px-5 py-[18px] text-left transition-shadow hover:shadow-[0_6px_18px_oklch(0.2_0.02_60/0.07)]"
          >
            <span className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Icon className="size-4.5" aria-hidden="true" /></span><span><span className="block text-sm font-extrabold">{item.label}</span><span className="mt-1 block text-[13px] text-muted-foreground">{item.description}</span></span></span>
            <span className="ml-3 text-lg text-muted-foreground">›</span>
          </button>
        )
      })}
    </div>
  )
}

function CategoriesSection({ tripCode, canEdit, onBack }: { tripCode: string; canEdit: boolean; onBack: () => void }) {
  const client = useQueryClient()
  const [name, setName] = useState("")
  const categories = useQuery({ queryKey: qk.expenseCategories(tripCode), queryFn: async () => (await listExpenseCategories(tripCode)).data ?? [] })
  const refresh = () => client.invalidateQueries({ queryKey: qk.expenseCategories(tripCode) })
  const create = useMutation({
    mutationFn: (value: string) => createExpenseCategory(tripCode, value),
    onSuccess: async () => { setName(""); toast.success("Category added"); await refresh() },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not add category"),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteExpenseCategory(tripCode, id),
    onSuccess: async () => { toast.success("Category removed"); await refresh() },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not remove category"),
  })
  return (
    <div className="space-y-4">
      <SectionHeader title="Categories" onBack={onBack} />
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex flex-wrap gap-2">
            {(categories.data ?? []).map((category) => (
              <span key={category.id} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium", categoryColorFor(category.name))}>
                {category.name}
                {category.isDefault ? null : canEdit ? (
                  <button type="button" aria-label={`Remove ${category.name}`} onClick={() => remove.mutate(category.id)} disabled={remove.isPending}>
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </span>
            ))}
          </div>
          {canEdit ? (
            <form className="flex gap-2" method="post" onSubmit={(event) => { event.preventDefault(); if (name.trim()) create.mutate(name.trim()) }}>
              <Input placeholder="New category name" value={name} onChange={(event) => setName(event.target.value)} maxLength={50} />
              <Button type="submit" disabled={create.isPending || !name.trim()}>Add</Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function RolesSection({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Roles & permissions" onBack={onBack} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Owner</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm text-muted-foreground">
            <p>Edits any expense or settlement regardless of who created it.</p>
            <p>Approves or rejects pending expenses and settlements.</p>
            <p>Changes trip settings, categories, and currencies.</p>
            <p>Invites and removes members, and finalizes the trip.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Member</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm text-muted-foreground">
            <p>Adds expenses and settlements.</p>
            <p>Edits their own entries (or any entry, if the trip allows it).</p>
            <p>Views balances, the transfer plan, and trip history.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MembersSection({
  trip,
  participants,
  onBack,
}: {
  trip: Trip
  participants: Participant[]
  onBack: () => void
}) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState("")
  const [link, setLink] = useState("")
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null)

  const invitations = useQuery({
    queryKey: qk.invitations(trip.code),
    queryFn: async () => (await apiFetch<Invitation[]>(`/api/trips/${trip.code}/invitations`)).data ?? [],
    enabled: trip.canEditSettings,
  })
  const pending = (invitations.data ?? []).filter((invitation) => invitation.status === "pending")

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
  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/trips/${trip.code}/invitations/${id}`, { method: "DELETE" }),
    onSuccess: async () => { toast.success("Invitation revoked"); await queryClient.invalidateQueries({ queryKey: qk.invitations(trip.code) }) },
    onError: () => toast.error("Could not revoke invitation"),
  })

  return (
    <div className="space-y-4">
      <SectionHeader title="Members & invites" onBack={onBack} />
      <Card>
        <CardHeader><CardTitle className="text-base">Members</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {participants.map((participant) => {
            const name = participant.user?.name ?? participant.user?.email ?? "Participant"
            const mayEditBank = trip.canEditSettings || participant.userId === session?.user?.id
            return (
              <div key={participant.id} className="border-b pb-3 last:border-0">
                <div className="flex items-center justify-between gap-4">
                  <span>{name} <span className="text-muted-foreground">{participant.user?.email}</span></span>
                  <span className="flex items-center gap-2">
                    <Badge variant={participant.role === "planner" ? "default" : "secondary"}>{roleLabel(participant.role)}</Badge>
                    <span className="text-sm text-muted-foreground">{participant.bankInfo?.accountNumber ?? "No bank details"}</span>
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
          <CardHeader><CardTitle className="text-base">Invite someone</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="friend@example.com" />
              <Button disabled={invitationMutation.isPending} onClick={() => invitationMutation.mutate()}>Invite</Button>
            </div>
            {link ? (
              <>
                <p className="text-sm text-muted-foreground">Email delivery lands in a later release — share this link directly.</p>
                <Input readOnly value={link} />
              </>
            ) : null}
            {pending.length ? (
              <div className="space-y-2 border-t pt-3">
                <p className="text-sm font-medium">Pending invites</p>
                {pending.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{invitation.email}</span>
                    <Button size="sm" variant="ghost" disabled={revokeMutation.isPending} onClick={() => revokeMutation.mutate(invitation.id)}>Revoke</Button>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function PreferencesSection({
  trip,
  updateSettings,
  disabled,
  onBack,
}: {
  trip: Trip
  updateSettings: (change: Partial<Trip["settings"]>) => void
  disabled: boolean
  onBack: () => void
}) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Trip preferences" onBack={onBack} />
      <Card>
        <CardContent className="space-y-4 pt-6">
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Edit permission</span>
            <NativeSelect
              aria-label="Edit permission"
              disabled={!trip.canEditSettings || disabled}
              value={trip.settings.editPermission}
              onChange={(event) => updateSettings({ editPermission: event.target.value as Trip["settings"]["editPermission"] })}
            >
              <NativeSelectOption value="everyone">Everyone</NativeSelectOption>
              <NativeSelectOption value="own_only">Own entries only</NativeSelectOption>
            </NativeSelect>
          </label>
          {booleanSettings.map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm">{label}</span>
              <Switch
                aria-label={label}
                checked={trip.settings[key]}
                disabled={!trip.canEditSettings || disabled}
                onCheckedChange={() => updateSettings({ [key]: !trip.settings[key] })}
              />
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function CurrenciesSection({
  trip,
  updateBaseCurrency,
  disabled,
  onBack,
}: {
  trip: Trip
  updateBaseCurrency: (value: string) => void
  disabled: boolean
  onBack: () => void
}) {
  const [baseCurrency, setBaseCurrency] = useState(trip.baseCurrency)
  return (
    <div className="space-y-4">
      <SectionHeader title="Currencies & exchange rates" onBack={onBack} />
      <Card>
        <CardHeader><CardTitle className="text-base">Base currency</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input
            maxLength={3}
            className="w-24 uppercase"
            value={baseCurrency}
            disabled={!trip.canEditSettings || disabled}
            onChange={(event) => setBaseCurrency(event.target.value.toUpperCase())}
          />
          {trip.canEditSettings ? (
            <Button size="sm" disabled={disabled || baseCurrency === trip.baseCurrency} onClick={() => updateBaseCurrency(baseCurrency)}>
              Save
            </Button>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Exchange rates</CardTitle></CardHeader>
        <CardContent>
          <ExchangeRateManager tripCode={trip.code} baseCurrency={trip.baseCurrency} canEdit={trip.canEditSettings} />
        </CardContent>
      </Card>
    </div>
  )
}

export function SettingsPanel() {
  const initial = useTrip()
  const queryClient = useQueryClient()
  const [section, setSection] = useState<Section>("menu")

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

  function updateBaseCurrency(value: string) {
    settingsMutation.mutate(settingsPayload({ ...trip, baseCurrency: value }))
  }

  return (
    <div className="space-y-6">
      {section === "menu" ? <h1 className="font-heading text-[26px] font-extrabold">Settings</h1> : null}
      {section === "menu" ? <SettingsMenu onSelect={setSection} /> : null}
      {section === "menu" ? <Card className="max-w-[520px] rounded-[14px]">
        <CardHeader><CardTitle>Share trip</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input readOnly value={trip.code} />
          <Button onClick={() => navigator.clipboard.writeText(`${location.origin}/trip/${trip.code}`)}>Copy link</Button>
        </CardContent>
      </Card> : null}
      {section === "currencies" ? <CurrenciesSection trip={trip} updateBaseCurrency={updateBaseCurrency} disabled={settingsMutation.isPending} onBack={() => setSection("menu")} /> : null}
      {section === "categories" ? <CategoriesSection tripCode={trip.code} canEdit={trip.canEditSettings} onBack={() => setSection("menu")} /> : null}
      {section === "roles" ? <RolesSection onBack={() => setSection("menu")} /> : null}
      {section === "members" ? <MembersSection trip={trip} participants={participantsQuery.data} onBack={() => setSection("menu")} /> : null}
      {section === "preferences" ? <PreferencesSection trip={trip} updateSettings={updateSettings} disabled={settingsMutation.isPending} onBack={() => setSection("menu")} /> : null}
    </div>
  )
}
