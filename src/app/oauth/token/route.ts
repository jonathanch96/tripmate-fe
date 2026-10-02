import type { NextRequest } from "next/server"

import { passthrough } from "@/lib/server/passthrough"

export function POST(request: NextRequest) {
  return passthrough(request, "/oauth/token")
}

export function OPTIONS(request: NextRequest) {
  return passthrough(request, "/oauth/token")
}
