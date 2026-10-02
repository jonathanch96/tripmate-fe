import { z } from "zod"

import { OAUTH_SCOPES } from "@/features/oauth/scopes"

export const approveSchema = z.object({ scopes: z.array(z.enum(OAUTH_SCOPES)).max(OAUTH_SCOPES.length) })
