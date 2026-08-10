import type { NextRequest } from "next/server"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"
import { rateSetSchema } from "@/features/finance/schema"
type Context = { params: Promise<{ code: string }> }
export async function GET(request: NextRequest, { params }: Context) { const { code } = await params; return authenticatedProxy(request, `/trips/${encodeURIComponent(code)}/exchange-rates`) }
export async function PUT(request: NextRequest, { params }: Context) { const { code } = await params; return authenticatedProxy(request, `/trips/${encodeURIComponent(code)}/exchange-rates`, rateSetSchema) }
export async function DELETE(request: NextRequest, { params }: Context) { const { code } = await params; return authenticatedProxy(request, `/trips/${encodeURIComponent(code)}/exchange-rates${request.nextUrl.search}`) }
