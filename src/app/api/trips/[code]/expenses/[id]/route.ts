import type { NextRequest } from "next/server"

import { expenseUpdateSchema } from "@/features/expense/schema"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ code: string; id: string }> }
const path = (code: string, id: string) => `/trips/${encodeURIComponent(code)}/expenses/${encodeURIComponent(id)}`

export async function GET(request: NextRequest, context: Context) { const { code, id } = await context.params; return authenticatedProxy(request, path(code, id)) }
export async function PATCH(request: NextRequest, context: Context) { const { code, id } = await context.params; return authenticatedProxy(request, path(code, id), expenseUpdateSchema) }
export async function DELETE(request: NextRequest, context: Context) { const { code, id } = await context.params; return authenticatedProxy(request, path(code, id)) }
