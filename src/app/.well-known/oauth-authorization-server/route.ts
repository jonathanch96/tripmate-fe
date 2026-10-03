import type { NextRequest } from "next/server"

import { passthrough } from "@/lib/server/passthrough"

// OAuth discovery metadata for AI tools connecting to /mcp.
export function GET(request: NextRequest) {
  return passthrough(request, "/.well-known/oauth-authorization-server")
}

export function OPTIONS(request: NextRequest) {
  return passthrough(request, "/.well-known/oauth-authorization-server")
}
