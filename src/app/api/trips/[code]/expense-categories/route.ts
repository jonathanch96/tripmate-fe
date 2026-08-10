import type { NextRequest } from "next/server"

import { expenseCategoryCreateSchema } from "@/features/expense/schema"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"

type Context = { params: Promise<{ code: string }> }

export async function GET(request: NextRequest, context: Context) {
  const { code } = await context.params
  return authenticatedProxy(request, `/trips/${encodeURIComponent(code)}/expense-categories`)
}

export async function POST(request: NextRequest, context: Context) {
  const { code } = await context.params
  return authenticatedProxy(
    request,
    `/trips/${encodeURIComponent(code)}/expense-categories`,
    expenseCategoryCreateSchema,
  )
}
