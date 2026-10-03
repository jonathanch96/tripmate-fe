import type { NextRequest } from "next/server"

import { passthrough } from "@/lib/server/passthrough"

// The MCP endpoint AI tools connect to (Streamable HTTP). Authentication is the OAuth bearer token
// the backend issued, checked there.
export function GET(request: NextRequest) {
  return passthrough(request, "/mcp")
}

export function POST(request: NextRequest) {
  return passthrough(request, "/mcp")
}

export function DELETE(request: NextRequest) {
  return passthrough(request, "/mcp")
}

export function OPTIONS(request: NextRequest) {
  return passthrough(request, "/mcp")
}
