import "server-only"

import type { Envelope } from "@/lib/envelope"

export type BackendInit = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit
  requestId?: string
  accessToken?: string
}

export type BackendResult<T> = {
  envelope: Envelope<T>
  status: number
}

function backendBaseUrl(): string {
  const value = process.env.BACKEND_BASE_URL
  if (!value) {
    throw new Error("BACKEND_BASE_URL is required")
  }
  return value.replace(/\/$/, "")
}

export async function backendFetch<T>(path: string, init: BackendInit = {}): Promise<BackendResult<T>> {
  if (!path.startsWith("/")) {
    throw new Error("Backend paths must start with /")
  }
  const headers = new Headers(init.headers)
  headers.set("X-Request-ID", init.requestId ?? crypto.randomUUID())
  if (init.body !== undefined && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }
  if (init.accessToken) {
    headers.set("Authorization", `Bearer ${init.accessToken}`)
  }
  const response = await fetch(`${backendBaseUrl()}/api/v1${path}`, {
    ...init,
    headers,
    cache: "no-store",
  })
  const envelope = (await response.json()) as Envelope<T>
  return { envelope, status: response.status }
}
