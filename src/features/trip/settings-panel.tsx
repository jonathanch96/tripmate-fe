"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { X } from "lucide-react"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
import { passwordSchema } from "@/features/auth/schema"
import {
  participantBankSchema,
  participantUpdateSchema,
  tripUpdateSchema,
  type ParticipantBankInput,
  type TripUpdateInput,
} from "@/features/trip/schema"
import { useTrip } from "@/features/trip/trip-context"
import type { Participant, Trip } from "@/features/trip/types"
import { avatarColorFor, initialsOf } from "@/lib/avatar-colors"
import { COUNTRIES } from "@/lib/countries"
import { participantName } from "@/lib/participant-name"
import { categoryColorFor } from "@/lib/category-colors"
import { apiFetch } from "@/lib/api-client"
import { apiErrorMessage, ApiError } from "@/lib/envelope"
import { generatePassword } from "@/lib/generate-password"
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
    country: trip.country ?? undefined,
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
    onError: (error) => toast.error(apiErrorMessage(error, "Could not update bank details")),
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

function NameEditor({
  code,
  participant,
  onClose,
}: {
  code: string
  participant: Participant
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(participant.displayName ?? "")
  const mutation = useMutation({
    mutationFn: async (displayName: string) => {
      const body = participantUpdateSchema.parse({ displayName })
      const response = await apiFetch<Participant>(
        `/api/trips/${code}/participants/${participant.id}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      )
      if (!response.data) throw new Error("The participant response was empty")
      return response.data
    },
    onSuccess: async () => {
      toast.success("Name updated")
      await queryClient.invalidateQueries({ queryKey: qk.participants(code) })
      onClose()
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not update name")),
  })

  return (
    <form
      className="mt-3 flex items-center gap-2"
      method="post"
      onSubmit={(event) => { event.preventDefault(); mutation.mutate(value) }}
    >
      <Input
        aria-label={`Trip nickname for ${participant.user?.name ?? participant.user?.email ?? "this participant"}`}
        placeholder={participant.user?.name || participant.user?.email || "Display name"}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={120}
        autoFocus
      />
      <Button type="submit" size="sm" disabled={mutation.isPending}>{mutation.isPending ? <Spinner /> : "Save"}</Button>
      <Button type="button" size="sm" variant="outline" onClick={onClose}>Cancel</Button>
    </form>
  )
}

type Section = "menu" | "details" | "currencies" | "categories" | "roles" | "members" | "preferences"

const MENU_ITEMS: Array<{ id: Section; label: string; description: string }> = [
  { id: "details", label: "Trip details", description: "The country (or countries) this trip covers." },
  { id: "currencies", label: "Currencies & exchange rates", description: "Base currency and rates between currencies used on this trip." },
  { id: "categories", label: "Categories", description: "The categories expenses can be tagged with." },
  { id: "roles", label: "Roles & permissions", description: "What owners and members can each do." },
  { id: "members", label: "Members & invites", description: "Who's on this trip, bank details, and pending invites." },
  { id: "preferences", label: "Trip preferences", description: "Approval requirements and editing rules." },
]

const SECTION_LABELS: Record<Exclude<Section, "menu">, string> = {
  details: "Trip details",
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
    onError: (error) => toast.error(apiErrorMessage(error, "Could not add category")),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteExpenseCategory(tripCode, id),
    onSuccess: async () => { toast.success("Category removed"); await refresh() },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not remove category")),
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
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [sentLink, setSentLink] = useState("")
  const [sentPassword, setSentPassword] = useState("")
  const [editingBank, setEditingBank] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string | null>(null)

  function onInviteOpenChange(open: boolean) {
    setInviteOpen(open)
    if (!open) {
      setEmail("")
      setPassword("")
      setConfirmPassword("")
      setSentLink("")
      setSentPassword("")
    }
  }

  const invitationMutation = useMutation({
    mutationFn: async () =>
      apiFetch<{ status: string; inviteLink?: string }>(`/api/trips/${trip.code}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
    onSuccess: (response) => {
      if (response.data?.inviteLink) {
        setSentLink(`${location.origin}${response.data.inviteLink}`)
        setSentPassword(password)
      }
      toast.success(response.data?.status === "added" ? "Participant added" : "Invitation created")
      setEmail("")
      setPassword("")
      setConfirmPassword("")
      void queryClient.invalidateQueries({ queryKey: qk.participants(trip.code) })
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not create invitation")),
  })

  function sendInvite() {
    if (!email.trim()) {
      toast.error("Enter an email address")
      return
    }
    const parsed = passwordSchema.safeParse(password)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter a valid password")
      return
    }
    if (password !== confirmPassword) {
      toast.error("Passwords must match")
      return
    }
    invitationMutation.mutate()
  }

  const [removingId, setRemovingId] = useState<string | null>(null)
  const removeMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/trips/${trip.code}/participants/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("Member removed")
      setRemovingId(null)
      await queryClient.invalidateQueries({ queryKey: qk.participants(trip.code) })
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not remove member — they may still have expenses or settlements on this trip")),
  })

  return (
    <div>
      <SectionTitle>Members & invites</SectionTitle>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading text-[15px] font-extrabold">Members</h3>
        {trip.canEditSettings ? (
          <Dialog open={inviteOpen} onOpenChange={onInviteOpenChange}>
            <DialogTrigger render={<Button className="font-bold">+ Invite people</Button>} />
            <DialogContent className="rounded-[20px] sm:max-w-md">
              <DialogHeader className="mb-1.5">
                <DialogTitle className="font-heading text-[19px] font-extrabold">Invite people</DialogTitle>
                <DialogDescription className="text-[13px]">Add someone to this trip and set the password they&apos;ll sign in with — no email confirmation needed.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2.5">
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="friend@example.com" />
                <div className="flex gap-2.5">
                  <Input type="text" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password for them to sign in with" />
                  <Button type="button" variant="outline" className="shrink-0 font-bold" onClick={() => { const generated = generatePassword(); setPassword(generated); setConfirmPassword(generated) }}>Generate</Button>
                </div>
                <Input type="text" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" />
              </div>
              {sentLink ? (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Share this link and password with them directly.</p>
                  <Input readOnly value={sentLink} aria-label="Invite link" />
                  <Input readOnly value={sentPassword} aria-label="Invite password" />
                </div>
              ) : null}
              <DialogFooter className="mx-0 mb-0 rounded-b-[20px]">
                <Button variant="outline" onClick={() => onInviteOpenChange(false)}>Cancel</Button>
                <Button className="font-bold" disabled={invitationMutation.isPending} onClick={sendInvite}>{invitationMutation.isPending ? <Spinner /> : "Send invite"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
      <div className="rounded-[14px] border border-border bg-white px-5">
        {participants.map((participant) => {
          const name = participantName(participant)
          const realName = participant.user?.name ?? participant.user?.email ?? "Participant"
          const isSelf = participant.userId === session?.user?.id
          const mayEdit = trip.canEditSettings || isSelf
          const mayRemove = trip.canEditSettings && !isSelf
          return (
            <div key={participant.id} className="border-b border-[oklch(0.95_0.006_60)] py-3.5 last:border-0">
              <div className="flex items-center gap-3.5">
                <Avatar size="sm"><AvatarFallback className={avatarColorFor(name)}>{initialsOf(name)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {name}
                    {mayEdit ? (
                      <button
                        type="button"
                        className="ml-2 text-xs font-semibold text-primary hover:underline"
                        onClick={() => setEditingName(participant.id)}
                      >
                        Edit
                      </button>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {participant.displayName ? `${realName} · ${participant.user?.email}` : participant.user?.email}
                  </p>
                </div>
                {participant.user && !participant.user.hasLoggedIn ? (
                  <Badge className="shrink-0 bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" title="Invited — can be assigned to expenses, but hasn't signed in yet">Not logged in yet</Badge>
                ) : null}
                <Badge className="shrink-0 bg-muted text-muted-foreground capitalize">{roleLabel(participant.role)}</Badge>
                {mayEdit ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-auto shrink-0 rounded-[7px] px-2.5 py-1 text-xs font-semibold"
                    aria-label={`Edit bank details for ${name}`}
                    onClick={() => setEditingBank(participant.id)}
                  >
                    Edit bank
                  </Button>
                ) : null}
                {mayRemove ? (
                  <AlertDialog open={removingId === participant.id} onOpenChange={(open) => setRemovingId(open ? participant.id : null)}>
                    <AlertDialogTrigger
                      render={<button type="button" className="shrink-0 text-xs font-semibold text-destructive hover:underline" aria-label={`Remove ${name} from this trip`} />}
                    >
                      Remove
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {name} from this trip?</AlertDialogTitle>
                        <AlertDialogDescription>
                          They&apos;ll lose access to this trip. This only works if they have no expenses, splits, or settlements recorded — if they do, removal will be blocked.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate(participant.id)}>
                          {removeMutation.isPending ? <Spinner /> : "Remove"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
              {editingName === participant.id ? (
                <NameEditor code={trip.code} participant={participant} onClose={() => setEditingName(null)} />
              ) : null}
              {editingBank === participant.id ? (
                <BankEditor code={trip.code} participant={participant} onClose={() => setEditingBank(null)} />
              ) : null}
            </div>
          )
        })}
      </div>
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

function DetailsSection({
  trip,
  updateCountry,
  disabled,
}: {
  trip: Trip
  updateCountry: (value: string) => void
  disabled: boolean
}) {
  return (
    <div>
      <SectionTitle>Trip details</SectionTitle>
      <div className="max-w-lg rounded-[14px] border border-border bg-white p-5">
        <label className="mb-2 block text-sm font-semibold" htmlFor="trip-details-country">Country</label>
        <NativeSelect
          id="trip-details-country"
          disabled={!trip.canEditSettings || disabled}
          value={trip.country ?? ""}
          onChange={(event) => updateCountry(event.target.value)}
        >
          <NativeSelectOption value="">Not set</NativeSelectOption>
          {COUNTRIES.map((country) => (
            <NativeSelectOption key={country} value={country}>{country}</NativeSelectOption>
          ))}
        </NativeSelect>
        <p className="mt-2.5 text-xs text-muted-foreground">Used to group this trip on the Analytics page.</p>
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
              country: payload.country || null,
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
        toast.error(apiErrorMessage(error, "Could not update settings"))
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

  function updateCountry(value: string) {
    settingsMutation.mutate(settingsPayload({ ...trip, country: value }))
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
      {section === "details" ? <DetailsSection trip={trip} updateCountry={updateCountry} disabled={settingsMutation.isPending} /> : null}
      {section === "currencies" ? <CurrenciesSection trip={trip} updateBaseCurrency={updateBaseCurrency} /> : null}
      {section === "categories" ? <CategoriesSection tripCode={trip.code} canEdit={trip.canEditSettings} /> : null}
      {section === "roles" ? <RolesSection /> : null}
      {section === "members" ? <MembersSection trip={trip} participants={participantsQuery.data} /> : null}
      {section === "preferences" ? <PreferencesSection trip={trip} updateSettings={updateSettings} disabled={settingsMutation.isPending} /> : null}
    </div>
  )
}
