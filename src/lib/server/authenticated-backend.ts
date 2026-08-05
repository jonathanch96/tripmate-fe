import "server-only"

import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

import { camelize } from "@/lib/case"
import { backendFetch, type BackendInit, type BackendResult } from "@/lib/server/backend"

export async function authenticatedBackendFetch<T>(request: NextRequest, path: string, init: BackendInit = {}): Promise<BackendResult<T>> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.accessToken) throw new Error("UNAUTHENTICATED")
  const result = await backendFetch<T>(path, { ...init, accessToken: token.accessToken })
  return { ...result, envelope: camelize(result.envelope) }
}
