import type { NextRequest } from "next/server"

import { tripSchema } from "@/features/trip/schema"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

export function GET(request: NextRequest) {
  return authenticatedProxy(request, `/trips${request.nextUrl.search}`)
}

export function POST(request: NextRequest) {
  return authenticatedProxy(request, "/trips", tripSchema)
}
