import "server-only"

import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import type { z } from "zod"

import { camelize, decamelize } from "@/lib/case"
import { authenticatedBackendFetch } from "@/lib/server/authenticated-backend"

function validationFailure(request: NextRequest, error: z.ZodError) {
  const traceId = request.headers.get("X-Request-ID") ?? crypto.randomUUID()
  return NextResponse.json(
    {
      success: false,
      code: "VALIDATION_FAILED",
      message: "The request contains invalid fields",
      data: null,
      meta: {},
      errors: error.issues.map((issue) => ({
        field: issue.path.join("."),
        rule: issue.code,
        message: issue.message,
      })),
      traceId,
      timestamp: new Date().toISOString(),
    },
    { status: 400, headers: { "X-Request-ID": traceId } },
  )
}

export async function authenticatedProxy(
  request: NextRequest,
  path: string,
  schema?: z.ZodType,
) {
  try {
    const hasBody = !["GET", "HEAD", "DELETE"].includes(request.method)
    let value = hasBody ? await request.json().catch(() => undefined) : undefined
    if (schema) {
      const parsed = schema.safeParse(value)
      if (!parsed.success) return validationFailure(request, parsed.error)
      value = parsed.data
    }
    const { envelope, status } = await authenticatedBackendFetch(request, path, {
      method: request.method,
      requestId: request.headers.get("X-Request-ID") ?? undefined,
      body: value === undefined ? undefined : JSON.stringify(decamelize(value)),
    })
    return NextResponse.json(camelize(envelope), { status })
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: "UNAUTHENTICATED",
        message: "Authentication is required",
        data: null,
        meta: {},
        errors: [],
      },
      { status: 401 },
    )
  }
}
