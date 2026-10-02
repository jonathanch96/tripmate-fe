import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { passthrough } from "@/lib/server/passthrough"

vi.mock("@/lib/server/backend", () => ({ backendBaseUrl: () => "http://backend:8080" }))

describe("passthrough", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("forwards the MCP request untouched and relays the backend's answer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Bearer resource_metadata="https://trip.example/.well-known/oauth-protected-resource/mcp"', "Content-Length": "12" },
    }))
    vi.stubGlobal("fetch", fetchMock)
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })
    const request = new NextRequest("https://trip.example/mcp", {
      method: "POST",
      headers: { Authorization: "Bearer tmat_x", "Content-Type": "application/json", "MCP-Protocol-Version": "2025-06-18", Cookie: "next-auth.session-token=secret" },
      body,
    })

    const response = await passthrough(request, "/mcp")

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("http://backend:8080/mcp")
    expect(init.redirect).toBe("manual")
    expect(new TextDecoder().decode(init.body)).toBe(body)
    const headers = init.headers as Headers
    expect(headers.get("authorization")).toBe("Bearer tmat_x")
    expect(headers.get("mcp-protocol-version")).toBe("2025-06-18")
    // The site's own session cookie must never travel to the MCP backend.
    expect(headers.get("cookie")).toBeNull()
    expect(response.status).toBe(401)
    expect(response.headers.get("WWW-Authenticate")).toContain("resource_metadata")
    expect(response.headers.get("Content-Length")).toBeNull()
  })

  it("keeps the query string and hands redirects back to the browser", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { Location: "https://trip.example/oauth/consent?request_id=r1" } }))
    vi.stubGlobal("fetch", fetchMock)
    const request = new NextRequest("https://trip.example/oauth/authorize?client_id=tmc_1&state=s")

    const response = await passthrough(request, "/oauth/authorize")

    expect(fetchMock.mock.calls[0][0]).toBe("http://backend:8080/oauth/authorize?client_id=tmc_1&state=s")
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("https://trip.example/oauth/consent?request_id=r1")
  })
})
