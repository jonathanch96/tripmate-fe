import type { NextRequest } from "next/server"

import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ token: string }> }

export async function POST(request: NextRequest, context: Context) {
  const { token } = await context.params
  return authenticatedProxy(request, `/invitations/${encodeURIComponent(token)}/accept`)
}
