import type { NextRequest } from "next/server"

import { tripUpdateSchema } from "@/features/trip/schema"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ code: string }> }

export async function GET(request: NextRequest, context: Context) {
  const { code } = await context.params
  return authenticatedProxy(request, `/trips/${encodeURIComponent(code)}`)
}

export async function PATCH(request: NextRequest, context: Context) {
  const { code } = await context.params
  return authenticatedProxy(request, `/trips/${encodeURIComponent(code)}`, tripUpdateSchema)
}
