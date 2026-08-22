"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BellIcon, ChevronRightIcon, CoinsIcon, KeyRoundIcon, LogOutIcon, PencilIcon } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import type { ReactNode } from "react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingState } from "@/components/ui/spinner"
import { ChangePasswordDialog } from "@/features/auth/change-password-dialog"
import { apiFetch } from "@/lib/api-client"
import { avatarColorFor, initialsOf } from "@/lib/avatar-colors"
import { apiErrorMessage } from "@/lib/envelope"

type Profile = { id: string; name: string; email: string; avatarUrl?: string | null }

function SettingRow({ icon: Icon, title, detail, trailing }: {
  icon: typeof BellIcon
  title: string
  detail?: string
  trailing?: ReactNode
}) {
  return (
    <div className="flex min-h-16 items-center gap-3 border-b border-border px-4 py-3 last:border-0">
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-muted text-muted-foreground"><Icon className="size-[18px]" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>
        {detail ? <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p> : null}
      </div>
      {trailing ?? <ChevronRightIcon className="size-4 text-muted-foreground" />}
    </div>
  )
}

export default function AccountPage() {
  const { data: session } = useSession()
  const client = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState("")
  const profile = useQuery({
    queryKey: ["tripmate", "profile"],
    queryFn: async () => (await apiFetch<Profile>("/api/users/me")).data!,
  })

  const update = useMutation({
    mutationFn: () => apiFetch<Profile>("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    }),
    onSuccess: async () => {
      toast.success("Profile updated")
      setEditing(false)
      await client.invalidateQueries({ queryKey: ["tripmate", "profile"] })
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not update profile")),
  })

  if (profile.isLoading) return <LoadingState label="Loading your account…" className="justify-center" />

  const userName = profile.data?.name || session?.user?.name || "Traveler"
  const email = profile.data?.email || session?.user?.email || ""

  return (
    <section className="mx-auto max-w-xl">
      <div className="mb-6">
        <p className="text-sm font-semibold text-muted-foreground">Your space</p>
        <h1 className="mt-1 font-heading text-[28px] font-extrabold">Account</h1>
      </div>

      <div className="mb-6 rounded-[18px] bg-[oklch(0.24_0.045_255)] p-5 text-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`grid size-14 shrink-0 place-items-center rounded-full text-lg font-extrabold ${avatarColorFor(userName)}`}>
            {initialsOf(userName)}
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex gap-2">
                <Input value={name} onChange={(event) => setName(event.target.value)} className="h-10 border-white/20 bg-white text-foreground" aria-label="Your name" />
                <Button size="sm" variant="secondary" disabled={!name.trim() || update.isPending} onClick={() => update.mutate()}>Save</Button>
              </div>
            ) : (
              <>
                <p className="truncate font-heading text-lg font-extrabold">{userName}</p>
                <p className="mt-0.5 truncate text-xs text-white/65">{email}</p>
              </>
            )}
          </div>
          {!editing ? (
            <button type="button" aria-label="Edit profile" onClick={() => { setName(userName); setEditing(true) }} className="grid size-10 place-items-center rounded-full bg-white/10 text-white active:bg-white/20">
              <PencilIcon className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <h2 className="mb-3 font-heading text-[15px] font-extrabold">Preferences</h2>
      <div className="mb-6 overflow-hidden rounded-[16px] border border-border bg-white">
        <SettingRow icon={CoinsIcon} title="Default currency" detail="Set individually for each trip" trailing={<span className="text-xs font-bold text-muted-foreground">Per trip</span>} />
        <SettingRow icon={BellIcon} title="Notifications" detail="Invitation and approval updates" trailing={<span className="text-xs font-bold text-muted-foreground">On</span>} />
        <ChangePasswordDialog trigger={
          <button type="button" className="flex min-h-16 w-full items-center gap-3 border-b border-border px-4 py-3 text-left">
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-muted text-muted-foreground"><KeyRoundIcon className="size-[18px]" /></span>
            <span className="flex-1 text-sm font-bold">Change password</span>
            <ChevronRightIcon className="size-4 text-muted-foreground" />
          </button>
        } />
        <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left text-destructive">
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-destructive/10"><LogOutIcon className="size-[18px]" /></span>
          <span className="flex-1 text-sm font-bold">Sign out</span>
        </button>
      </div>
    </section>
  )
}
