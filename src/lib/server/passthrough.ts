import "server-only"

import type { NextRequest } from "next/server"

import { backendBaseUrl } from "@/lib/server/backend"

// The MCP endpoint and its OAuth protocol endpoints are called by AI tools (Claude, ChatGPT, ...)
// directly, not by this app's browser code, so they are forwarded byte-for-byte: no envelope, no
// camelCase conversion, no session. Only the frontend is public; this is how those calls reach the
// backend on the private network.
const forwardedRequestHeaders = new Set(["accept", "authorization", "content-type", "last-event-id", "origin", "user-agent"])

// Every MCP transport header is forwarded, not a fixed list: protocol 2026-07-28 requires Mcp-Method,
// Mcp-Name and Mcp-Param-* on each request, and clients that speak only that revision (ChatGPT)
// fail to connect when the backend doesn't see them.
function forwardsRequestHeader(name: string) {
  return forwardedRequestHeaders.has(name) || name.startsWith("mcp-")
}

// Hop-by-hop headers and ones fetch() already decoded must not be replayed onto the new response.
const droppedResponseHeaders = new Set(["connection", "content-encoding", "content-length", "keep-alive", "transfer-encoding"])

export async function passthrough(request: NextRequest, path: string): Promise<Response> {
  const headers = new Headers()
  request.headers.forEach((value, name) => {
    if (value && forwardsRequestHeader(name.toLowerCase())) headers.set(name, value)
  })
  headers.set("X-Request-ID", request.headers.get("x-request-id") ?? crypto.randomUUID())
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) headers.set("X-Forwarded-For", forwardedFor)

  const hasBody = request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS"
  const response = await fetch(`${backendBaseUrl()}${path}${request.nextUrl.search}`, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    // /oauth/authorize answers with a redirect the browser must follow itself.
    redirect: "manual",
    cache: "no-store",
  })

  const responseHeaders = new Headers()
  response.headers.forEach((value, name) => {
    if (!droppedResponseHeaders.has(name.toLowerCase())) responseHeaders.set(name, value)
  })
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: responseHeaders })
}
