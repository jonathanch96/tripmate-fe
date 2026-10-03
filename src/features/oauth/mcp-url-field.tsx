"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { useState, useSyncExternalStore } from "react"
import { toast } from "sonner"

import { SITE_URL } from "@/lib/seo"
import { cn } from "@/lib/utils"

const noSubscription = () => () => {}

// The MCP endpoint lives on the same public origin as the site. In the browser it is read from the
// address the user is actually on; during server rendering the configured site URL stands in.
export function useMcpUrl() {
  return useSyncExternalStore(noSubscription, () => `${window.location.origin}/mcp`, () => `${SITE_URL}/mcp`)
}

export function McpUrlField({ className }: { className?: string }) {
  const url = useMcpUrl()
  const [copied, setCopied] = useState(false)
  return (
    <div className={cn("flex items-center gap-2 rounded-[10px] border border-border bg-muted px-3 py-2", className)}>
      <code className="min-w-0 flex-1 truncate text-xs font-semibold">{url}</code>
      <button
        type="button"
        aria-label="Copy MCP server URL"
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-background"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch {
            toast.error("Couldn't copy - select the address and copy it manually")
          }
        }}
      >
        {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
      </button>
    </div>
  )
}
