import type { NextRequest } from "next/server"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"
import { settlementCreateSchema } from "@/features/finance/schema"
type Context = { params: Promise<{ code: string }> }
export async function GET(request: NextRequest, { params }: Context) { const { code } = await params; return authenticatedProxy(request, `/trips/${encodeURIComponent(code)}/settlements${request.nextUrl.search}`) }
export async function POST(request: NextRequest, { params }: Context) { const { code } = await params; return authenticatedProxy(request, `/trips/${encodeURIComponent(code)}/settlements`, settlementCreateSchema) }
