import { apiFetch } from "@/lib/api-client"
import { qk } from "@/lib/query-keys"

import type { OAuthScope } from "@/features/oauth/scopes"

export type OAuthClient = { name: string; clientUri: string | null; logoUri: string | null }

export type AuthorizationRequest = {
  id: string
  client: OAuthClient
  redirectHost: string
  scopes: OAuthScope[]
  expiresAt: string
}

export type ConnectedApp = {
  id: string
  client: OAuthClient
  scopes: OAuthScope[]
  createdAt: string
  lastUsedAt: string
}

export const authorizationRequestQuery = (id: string) => ({
  queryKey: qk.oauthRequest(id),
  queryFn: async () => (await apiFetch<AuthorizationRequest>(`/api/oauth/requests/${encodeURIComponent(id)}`)).data!,
  retry: false,
  refetchOnWindowFocus: false,
})

export const connectedAppsQuery = () => ({
  queryKey: qk.connectedApps(),
  queryFn: async () => (await apiFetch<ConnectedApp[]>("/api/oauth/grants")).data ?? [],
})

// Both answers come back as the URL to send the browser to: the AI tool's callback, carrying either
// the authorization code or access_denied.
export async function approveRequest(id: string, scopes: OAuthScope[]) {
  const envelope = await apiFetch<{ redirectUrl: string }>(`/api/oauth/requests/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scopes }),
  })
  return envelope.data!.redirectUrl
}

export async function denyRequest(id: string) {
  const envelope = await apiFetch<{ redirectUrl: string }>(`/api/oauth/requests/${encodeURIComponent(id)}/deny`, { method: "POST" })
  return envelope.data!.redirectUrl
}

export async function disconnectApp(id: string) {
  await apiFetch(`/api/oauth/grants/${encodeURIComponent(id)}`, { method: "DELETE" })
}
