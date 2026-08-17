import type { NextRequest } from "next/server"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"
import { settlementUpdateSchema } from "@/features/finance/schema"
type Context = { params: Promise<{ code: string; id: string }> }
export async function PATCH(request: NextRequest, { params }: Context) { const { code, id } = await params; return authenticatedProxy(request, `/trips/${encodeURIComponent(code)}/settlements/${encodeURIComponent(id)}`, settlementUpdateSchema) }
export async function DELETE(request: NextRequest, { params }: Context) { const { code, id } = await params; return authenticatedProxy(request, `/trips/${encodeURIComponent(code)}/settlements/${encodeURIComponent(id)}`) }
