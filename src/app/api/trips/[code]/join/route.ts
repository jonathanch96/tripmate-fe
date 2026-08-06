import type { NextRequest } from "next/server"

import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ code: string }> }

export async function POST(request: NextRequest, context: Context) {
  const { code } = await context.params
  return authenticatedProxy(request, `/trips/${encodeURIComponent(code)}/join`)
}
