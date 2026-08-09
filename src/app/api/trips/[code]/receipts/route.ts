import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { authenticatedBackendFetch } from "@/lib/server/authenticated-backend"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ code: string }> }
export async function GET(request: NextRequest, context: Context) { const { code } = await context.params; return authenticatedProxy(request, `/trips/${encodeURIComponent(code)}/receipts${request.nextUrl.search}`) }
export async function POST(request: NextRequest, context: Context) {
  try {
    const { code } = await context.params
    const body = await request.formData()
    const { envelope, status } = await authenticatedBackendFetch(request, `/trips/${encodeURIComponent(code)}/receipts`, { method: "POST", body, requestId: request.headers.get("X-Request-ID") ?? undefined })
    return NextResponse.json(envelope, { status })
  } catch { return NextResponse.json({ success: false, code: "UNAUTHENTICATED", message: "Authentication is required", data: null, meta: {}, errors: [] }, { status: 401 }) }
}
