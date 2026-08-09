import type { NextRequest } from "next/server"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string; id: string }> }) { const { code, id } = await params; return authenticatedProxy(request, `/trips/${encodeURIComponent(code)}/receipts/${encodeURIComponent(id)}/extract`) }
