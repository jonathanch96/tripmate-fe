"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { ArrowRightIcon, SparklesIcon } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { connectedAppsQuery, disconnectApp, type ConnectedApp } from "@/features/oauth/api"
import { McpUrlField } from "@/features/oauth/mcp-url-field"
import { accessLabel } from "@/features/oauth/scopes"
import { avatarColorFor, initialsOf } from "@/lib/avatar-colors"
import { apiErrorMessage } from "@/lib/envelope"
import { qk } from "@/lib/query-keys"

function AppRow({ app }: { app: ConnectedApp }) {
  const client = useQueryClient()
  const disconnect = useMutation({
    mutationFn: () => disconnectApp(app.id),
    onSuccess: async () => {
      toast.success(`${app.client.name} disconnected`)
      await client.invalidateQueries({ queryKey: qk.connectedApps() })
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not disconnect the app")),
  })
  return (
    <div className="flex min-h-16 items-center gap-3 border-b border-border px-4 py-3 last:border-0">
      <span className={`grid size-9 shrink-0 place-items-center rounded-[10px] text-xs font-extrabold ${avatarColorFor(app.client.name)}`}>{initialsOf(app.client.name)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{app.client.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {accessLabel(app.scopes)} · used {formatDistanceToNow(new Date(app.lastUsedAt), { addSuffix: true })}
        </p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger render={<Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={disconnect.isPending} />}>
          {disconnect.isPending ? <Spinner /> : "Disconnect"}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {app.client.name}?</AlertDialogTitle>
            <AlertDialogDescription>It loses access to your TripMate account right away. Anything it already added stays.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => disconnect.mutate()}>Disconnect</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function ConnectedApps() {
  const apps = useQuery(connectedAppsQuery())
  return (
    <>
      <h2 className="mb-3 font-heading text-[15px] font-extrabold">AI assistants</h2>
      <div className="mb-6 overflow-hidden rounded-[16px] border border-border bg-white">
        <div className="border-b border-border px-4 py-4">
          <div className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-muted text-muted-foreground"><SparklesIcon className="size-[18px]" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Use TripMate in Claude or ChatGPT</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add a custom connector with this address, then sign in. You can snap a bill and let the assistant split it, add expenses, or ask who owes whom.
              </p>
            </div>
          </div>
          <McpUrlField className="mt-3" />
          <Link href="/ai#connect" className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
            Step-by-step setup for Claude, ChatGPT and others <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
        {apps.isLoading ? (
          <div className="flex justify-center px-4 py-4"><Spinner /></div>
        ) : apps.isError ? (
          <p className="px-4 py-4 text-xs text-destructive">{apiErrorMessage(apps.error, "Couldn't load connected apps")}</p>
        ) : apps.data && apps.data.length > 0 ? (
          apps.data.map((app) => <AppRow key={app.id} app={app} />)
        ) : (
          <p className="px-4 py-4 text-xs text-muted-foreground">No apps connected yet.</p>
        )}
      </div>
    </>
  )
}
