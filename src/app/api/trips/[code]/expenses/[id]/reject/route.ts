import type { NextRequest } from "next/server"
import { expenseRejectSchema } from "@/features/expense/schema"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"
type Context = { params: Promise<{ code: string; id: string }> }
export async function POST(request: NextRequest, context: Context) { const { code, id } = await context.params; return authenticatedProxy(request, `/trips/${encodeURIComponent(code)}/expenses/${encodeURIComponent(id)}/reject`, expenseRejectSchema) }
