import type { NextRequest } from "next/server"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"
type Context = { params: Promise<{ code: string; id: string }> }
export async function POST(request: NextRequest, { params }: Context) { const { code, id } = await params; return authenticatedProxy(request, `/trips/${encodeURIComponent(code)}/settlements/${encodeURIComponent(id)}/approve`) }
