import type { NextRequest } from "next/server"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"
type Context = { params: Promise<{ code: string; id: string; itemId: string }> }
const path = async (context: Context) => { const { code, id, itemId } = await context.params; return `/trips/${encodeURIComponent(code)}/receipts/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}` }
export async function PATCH(request: NextRequest, context: Context) { return authenticatedProxy(request, await path(context)) }
export async function DELETE(request: NextRequest, context: Context) { return authenticatedProxy(request, await path(context)) }
