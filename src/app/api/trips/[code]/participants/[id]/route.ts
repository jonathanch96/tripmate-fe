import type { NextRequest } from "next/server"

import { participantUpdateSchema } from "@/features/trip/schema"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ code: string; id: string }> }

function path(code: string, id: string) {
  return `/trips/${encodeURIComponent(code)}/participants/${encodeURIComponent(id)}`
}

export async function PATCH(request: NextRequest, context: Context) {
  const { code, id } = await context.params
  return authenticatedProxy(request, path(code, id), participantUpdateSchema)
}

export async function DELETE(request: NextRequest, context: Context) {
  const { code, id } = await context.params
  return authenticatedProxy(request, path(code, id))
}
