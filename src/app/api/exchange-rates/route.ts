import type { NextRequest } from "next/server"
import { authenticatedProxy } from "@/lib/server/authenticated-proxy"
export async function GET(request: NextRequest) { return authenticatedProxy(request, "/exchange-rates") }
