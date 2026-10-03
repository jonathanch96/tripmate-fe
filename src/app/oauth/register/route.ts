import type { NextRequest } from "next/server"

import { passthrough } from "@/lib/server/passthrough"

export function POST(request: NextRequest) {
  return passthrough(request, "/oauth/register")
}

export function OPTIONS(request: NextRequest) {
  return passthrough(request, "/oauth/register")
}
