"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { LoadingState, Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  createExpenseCategory,
  deleteExpenseCategory,
  listExpenseCategories,
} from "@/features/expense/category-api"
import { TripCurrenciesManager } from "@/features/finance/trip-currencies-manager"
import {
  participantBankSchema,
  participantUpdateSchema,
  tripUpdateSchema,
  type ParticipantBankInput,
  type TripUpdateInput,
} from "@/features/trip/schema"
import { useTrip } from "@/features/trip/trip-context"
import type { Invitation, Participant, Trip } from "@/features/trip/types"
import { avatarColorFor, initialsOf } from "@/lib/avatar-colors"
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
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? <Spinner /> : "Save"}</Button>
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

const MENU_ITEMS: Array<{ id: Section; label: string; description: string }> = [
  { id: "currencies", label: "Currencies & exchange rates", description: "Base currency and rates between currencies used on this trip." },
  { id: "categories", label: "Categories", description: "The categories expenses can be tagged with." },
  { id: "roles", label: "Roles & permissions", description: "What owners and members can each do." },
  { id: "members", label: "Members & invites", description: "Who's on this trip, bank details, and pending invites." },
  { id: "preferences", label: "Trip preferences", description: "Approval requirements and editing rules." },
]

const SECTION_LABELS: Record<Exclude<Section, "menu">, string> = {
  currencies: "Currencies & exchange rates",
  categories: "Categories",
  roles: "Roles & permissions",
  members: "Members & invites",
  preferences: "Trip preferences",
}

function Breadcrumb({ section, onBack }: { section: Section; onBack: () => void }) {
  return (
    <div className="mb-5 flex items-center gap-1.5 text-[13px]">
      {section === "menu" ? (
        <span className="font-bold">Settings</span>
      ) : (
        <>
          <button type="button" onClick={onBack} className="font-semibold text-primary hover:underline">Settings</button>
          <span className="text-muted-foreground">/</span>
          <span className="font-bold">{SECTION_LABELS[section]}</span>
        </>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="mb-5 font-heading text-[22px] font-extrabold">{children}</h1>
}

function SettingsMenu({ onSelect }: { onSelect: (section: Section) => void }) {
  return (
    <div>
      <h1 className="mb-6.5 font-heading text-[26px] font-extrabold">Settings</h1>
      <div className="flex max-w-[520px] flex-col gap-2.5">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-white px-5 py-[18px] text-left transition-shadow hover:shadow-[0_6px_18px_oklch(0.2_0.02_60_/_0.07)]"
          >
            <span>
              <span className="mb-1 block text-sm font-extrabold">{item.label}</span>
              <span className="block text-[13px] text-muted-foreground">{item.description}</span>
            </span>
            <span className="text-lg text-muted-foreground">›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function CategoriesSection({ tripCode, canEdit }: { tripCode: string; canEdit: boolean }) {
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
    <div>
      <SectionTitle>Categories</SectionTitle>
      {categories.isLoading ? <LoadingState label="Loading categories…" /> : (
        <div className="mb-3.5 flex flex-wrap gap-2">
          {(categories.data ?? []).map((category) => (
            <span key={category.id} className={cn("flex items-center gap-1.5 rounded-lg py-1.5 pr-1.5 pl-3 text-[13px] font-semibold", categoryColorFor(category.name))}>
              {category.name}
              {category.isDefault ? <span className="px-1 text-[10px] text-muted-foreground">default</span> : canEdit ? (
                <button type="button" aria-label={`Remove ${category.name}`} onClick={() => remove.mutate(category.id)} disabled={remove.isPending} className="px-1 text-destructive">
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      )}
      {canEdit ? (
        <form className="flex max-w-md gap-2.5" method="post" onSubmit={(event) => { event.preventDefault(); if (name.trim()) create.mutate(name.trim()) }}>
          <Input placeholder="New category (e.g. Groceries)" value={name} onChange={(event) => setName(event.target.value)} maxLength={50} />
          <Button type="submit" variant="secondary" className="font-bold" disabled={create.isPending || !name.trim()}>{create.isPending ? <Spinner /> : "Add category"}</Button>
        </form>
      ) : null}
    </div>
  )
}

function RolesSection() {
  return (
    <div>
      <SectionTitle>Roles & permissions</SectionTitle>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="rounded-[14px] border border-border bg-white p-[18px]">
          <p className="mb-2.5 text-[13px] font-extrabold">Owner</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Manage settings &amp; currencies · Invite or remove members · Edit or delete any expense · Approve or reject expenses and settlements · Record settlements
          </p>
        </div>
        <div className="rounded-[14px] border border-border bg-white p-[18px]">
          <p className="mb-2.5 text-[13px] font-extrabold">Member</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Add &amp; edit their own expenses · View all expenses &amp; balances · Record settlements · Cannot change settings or remove members
          </p>
        </div>
      </div>
    </div>
  )
}

function MembersSection({
  trip,
  participants,
}: {
  trip: Trip
  participants: Participant[]
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
    <div>
      <SectionTitle>Members & invites</SectionTitle>
      <h3 className="mb-3 font-heading text-[15px] font-extrabold">Members</h3>
      <div className="mb-8 rounded-[14px] border border-border bg-white px-5">
        {participants.map((participant) => {
          const name = participant.user?.name ?? participant.user?.email ?? "Participant"
          const mayEditBank = trip.canEditSettings || participant.userId === session?.user?.id
          return (
            <div key={participant.id} className="border-b border-[oklch(0.95_0.006_60)] py-3.5 last:border-0">
              <div className="flex items-center gap-3.5">
                <Avatar size="sm"><AvatarFallback className={avatarColorFor(name)}>{initialsOf(name)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">{participant.user?.email}</p>
                </div>
                <Badge className="shrink-0 bg-muted text-muted-foreground capitalize">{roleLabel(participant.role)}</Badge>
                {mayEditBank ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-auto shrink-0 rounded-[7px] px-2.5 py-1 text-xs font-semibold"
                    aria-label={`Edit bank details for ${name}`}
                    onClick={() => setEditingParticipant(participant.id)}
                  >
                    Edit bank
                  </Button>
                ) : null}
              </div>
              {editingParticipant === participant.id ? (
                <BankEditor code={trip.code} participant={participant} onClose={() => setEditingParticipant(null)} />
              ) : null}
            </div>
          )
        })}
      </div>
      {trip.canEditSettings ? (
        <>
          <h3 className="mb-3 font-heading text-[15px] font-extrabold">Invite people</h3>
          <div className="mb-3.5 flex max-w-lg gap-2.5">
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" />
            <Button className="font-bold" disabled={invitationMutation.isPending} onClick={() => invitationMutation.mutate()}>{invitationMutation.isPending ? <Spinner /> : "Send invite"}</Button>
          </div>
          {link ? (
            <div className="mb-3.5 max-w-lg space-y-1.5">
              <p className="text-xs text-muted-foreground">Email delivery lands in a later release — share this link directly.</p>
              <Input readOnly value={link} />
            </div>
          ) : null}
          {pending.length ? (
            <div className="max-w-lg rounded-[14px] border border-border bg-white px-5">
              {pending.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between gap-2 border-b border-[oklch(0.95_0.006_60)] py-3 text-[13px] last:border-0">
                  <span>{invitation.email} <span className="text-muted-foreground">· pending</span></span>
                  <button type="button" className="text-xs font-semibold text-destructive disabled:opacity-50" disabled={revokeMutation.isPending} onClick={() => revokeMutation.mutate(invitation.id)}>{revokeMutation.isPending ? <Spinner /> : "Revoke"}</button>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function PreferencesSection({
  trip,
  updateSettings,
  disabled,
}: {
  trip: Trip
  updateSettings: (change: Partial<Trip["settings"]>) => void
  disabled: boolean
}) {
  return (
    <div>
      <SectionTitle>Trip preferences</SectionTitle>
      <div className="max-w-lg rounded-[14px] border border-border bg-white px-5">
        <label className="flex items-center justify-between gap-4 border-b border-[oklch(0.95_0.006_60)] py-3.5">
          <span className="text-sm font-semibold">Edit permission</span>
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
          <label key={key} className="flex items-center justify-between gap-4 border-b border-[oklch(0.95_0.006_60)] py-3.5 last:border-0">
            <span className="text-sm font-semibold">{label}</span>
            <Switch
              aria-label={label}
              checked={trip.settings[key]}
              disabled={!trip.canEditSettings || disabled}
              onCheckedChange={() => updateSettings({ [key]: !trip.settings[key] })}
            />
          </label>
        ))}
      </div>
    </div>
  )
}

function CurrenciesSection({
  trip,
  updateBaseCurrency,
}: {
  trip: Trip
  updateBaseCurrency: (value: string) => void
}) {
  return (
    <div>
      <SectionTitle>Currencies & exchange rates</SectionTitle>
      <TripCurrenciesManager
        tripCode={trip.code}
        baseCurrency={trip.baseCurrency}
        canEdit={trip.canEditSettings}
        onBaseCurrencyChange={updateBaseCurrency}
      />
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
      } else if (error instanceof ApiError) {
        toast.error(error.envelope.errors[0]?.message ?? error.message)
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
    <div>
      <Breadcrumb section={section} onBack={() => setSection("menu")} />
      {section === "menu" ? (
        <Card className="mb-6 rounded-[14px]">
          <CardHeader><CardTitle className="text-base">Share trip</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input readOnly value={trip.code} />
            <Button className="font-bold" onClick={() => navigator.clipboard.writeText(`${location.origin}/trip/${trip.code}`)}>Copy link</Button>
          </CardContent>
        </Card>
      ) : null}
      {section === "menu" ? <SettingsMenu onSelect={setSection} /> : null}
      {section === "currencies" ? <CurrenciesSection trip={trip} updateBaseCurrency={updateBaseCurrency} /> : null}
      {section === "categories" ? <CategoriesSection tripCode={trip.code} canEdit={trip.canEditSettings} /> : null}
      {section === "roles" ? <RolesSection /> : null}
      {section === "members" ? <MembersSection trip={trip} participants={participantsQuery.data} /> : null}
      {section === "preferences" ? <PreferencesSection trip={trip} updateSettings={updateSettings} disabled={settingsMutation.isPending} /> : null}
    </div>
  )
}
