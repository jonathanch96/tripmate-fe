"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { CheckIcon, ShieldCheckIcon, TriangleAlertIcon } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { LoadingState, Spinner } from "@/components/ui/spinner"
import { approveRequest, authorizationRequestQuery, denyRequest, type AuthorizationRequest } from "@/features/oauth/api"
import { SCOPE_COPY, SCOPE_READ, SCOPE_WRITE, type OAuthScope } from "@/features/oauth/scopes"
import { avatarColorFor, initialsOf } from "@/lib/avatar-colors"
import { ApiError, apiErrorMessage } from "@/lib/envelope"

// Errors the authorization endpoint sends here instead of back to the AI tool, because the tool's
// identity or return address could not be trusted.
const ENTRY_ERRORS: Record<string, { title: string; detail: string }> = {
  invalid_client: {
    title: "This app isn't registered with TripMate",
    detail: "Go back to the app and connect TripMate again.",
  },
  invalid_redirect_uri: {
    title: "This connection was stopped",
    detail: "The app asked to send you to an address it didn't register, so TripMate didn't continue. Go back to the app and connect again.",
  },
}

function requestErrorCopy(error: unknown) {
  const code = error instanceof ApiError ? error.envelope.code : ""
  if (code === "OAUTH_REQUEST_EXPIRED") {
    return { title: "This request has expired", detail: "Connection requests last 10 minutes. Go back to the app and connect TripMate again." }
  }
  if (code === "OAUTH_REQUEST_NOT_FOUND") {
    return { title: "This request was already answered", detail: "If the app still isn't connected, go back to it and connect TripMate again." }
  }
  return { title: "Couldn't load this request", detail: apiErrorMessage(error, "Something went wrong. Try again from the app.") }
}

function Problem({ title, detail }: { title: string; detail: string }) {
  return (
    <Alert variant="destructive">
      <TriangleAlertIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{detail}</AlertDescription>
    </Alert>
  )
}

function AppMark({ request }: { request: AuthorizationRequest }) {
  const { name, logoUri } = request.client
  if (logoUri) {
    // A remote logo the app registered; plain <img> keeps arbitrary hosts out of next/image config.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUri} alt="" className="size-12 shrink-0 rounded-[12px] border border-border object-cover" />
  }
  return <span className={`grid size-12 shrink-0 place-items-center rounded-[12px] text-base font-extrabold ${avatarColorFor(name)}`}>{initialsOf(name)}</span>
}

export function ConsentCard({ requestId, entryError }: { requestId?: string; entryError?: string }) {
  const { data: session } = useSession()
  const request = useQuery({ ...authorizationRequestQuery(requestId ?? ""), enabled: Boolean(requestId) && !entryError })
  // null until the user touches the checkbox: it then starts from what the app asked for.
  const [writeChoice, setWriteChoice] = useState<boolean | null>(null)
  const allowWrite = writeChoice ?? Boolean(request.data?.scopes.includes(SCOPE_WRITE))
  const [leaving, setLeaving] = useState(false)

  const answer = useMutation({
    mutationFn: async (approve: boolean) => {
      if (!requestId) throw new Error("missing request")
      if (!approve) return denyRequest(requestId)
      const scopes: OAuthScope[] = [SCOPE_READ]
      if (allowWrite) scopes.push(SCOPE_WRITE)
      return approveRequest(requestId, scopes)
    },
    onSuccess: (redirectUrl) => {
      setLeaving(true)
      window.location.assign(redirectUrl)
    },
  })

  if (entryError) {
    return <Problem {...(ENTRY_ERRORS[entryError] ?? { title: "This connection couldn't continue", detail: "Go back to the app and connect TripMate again." })} />
  }
  if (!requestId) {
    return <Problem title="Nothing to approve" detail="Open this page by connecting TripMate from Claude, ChatGPT or another AI app." />
  }
  if (request.isLoading) return <LoadingState label="Loading request…" className="justify-center" />
  if (request.isError || !request.data) return <Problem {...requestErrorCopy(request.error)} />
  if (leaving) return <LoadingState label={`Returning you to ${request.data.client.name}…`} className="justify-center" />

  const data = request.data
  const wantsWrite = data.scopes.includes(SCOPE_WRITE)
  const busy = answer.isPending

  return (
    <div>
      <div className="flex items-center gap-3 rounded-[16px] border border-border bg-white p-4">
        <AppMark request={data} />
        <div className="min-w-0">
          <p className="truncate font-heading text-base font-extrabold">{data.client.name}</p>
          <p className="truncate text-xs text-muted-foreground">wants to use your TripMate account</p>
        </div>
      </div>

      <p className="mt-5 mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">It will be able to</p>
      <ul className="overflow-hidden rounded-[16px] border border-border bg-white">
        <li className="flex gap-3 border-b border-border px-4 py-3 last:border-0">
          <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-bold">{SCOPE_COPY[SCOPE_READ].title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{SCOPE_COPY[SCOPE_READ].detail}</p>
          </div>
        </li>
        {/* Always offered: an app that only asked to view can still be allowed to add expenses. */}
        <li className="border-b border-border last:border-0">
          <label className="flex cursor-pointer gap-3 px-4 py-3">
            <Checkbox checked={allowWrite} onCheckedChange={(checked) => setWriteChoice(checked === true)} className="mt-0.5" aria-label="Allow creating and editing" />
            <span>
              <span className="block text-sm font-bold">{SCOPE_COPY[SCOPE_WRITE].title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{SCOPE_COPY[SCOPE_WRITE].detail}</span>
              {wantsWrite ? null : (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {data.client.name} only asked to view. Tick this if you want it to add expenses and repayments for you.
                </span>
              )}
            </span>
          </label>
        </li>
      </ul>
      <p className="mt-3 flex gap-2 text-xs text-muted-foreground">
        <ShieldCheckIcon className="size-4 shrink-0" />
        <span>It can&apos;t delete anything or change trip settings, and only sees trips you&apos;re part of. You can disconnect it anytime from your Account page.</span>
      </p>

      {session?.user?.email ? (
        <p className="mt-5 text-xs text-muted-foreground">
          Signed in as <span className="font-bold text-foreground">{session.user.email}</span>.{" "}
          <button type="button" className="font-medium text-primary hover:underline" onClick={() => signOut({ callbackUrl: `/login?next=${encodeURIComponent(`/oauth/consent?request_id=${data.id}`)}` })}>
            Not you?
          </button>
        </p>
      ) : null}

      {answer.isError ? <div className="mt-4"><Problem {...requestErrorCopy(answer.error)} /></div> : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="outline" disabled={busy} onClick={() => answer.mutate(false)}>Deny</Button>
        <Button disabled={busy} onClick={() => answer.mutate(true)}>{busy ? <Spinner /> : "Allow"}</Button>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">You&apos;ll be sent back to {data.redirectHost}.</p>
    </div>
  )
}
