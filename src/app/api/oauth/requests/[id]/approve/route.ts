import type { NextRequest } from "next/server"

import { approveSchema } from "@/features/oauth/schema"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params
  return authenticatedProxy(request, `/oauth/requests/${encodeURIComponent(id)}/approve`, approveSchema)
}
