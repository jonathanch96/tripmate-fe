import type { NextRequest } from "next/server"

import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ code: string; id: string }> }

export async function DELETE(request: NextRequest, context: Context) {
  const { code, id } = await context.params
  return authenticatedProxy(
    request,
    `/trips/${encodeURIComponent(code)}/invitations/${encodeURIComponent(id)}`,
  )
}
