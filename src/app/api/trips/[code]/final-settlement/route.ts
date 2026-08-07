import type { NextRequest } from "next/server"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"
type Context = { params: Promise<{ code: string }> }
export async function GET(request: NextRequest, { params }: Context) { const { code } = await params; return authenticatedProxy(request, `/trips/${encodeURIComponent(code)}/final-settlement`) }
