import type { NextRequest } from "next/server"

import { passthrough } from "@/lib/server/passthrough"

// OAuth authorization endpoint: the backend validates the request and redirects to the consent page
// (or back to the AI tool with an error).
export function GET(request: NextRequest) {
  return passthrough(request, "/oauth/authorize")
}
