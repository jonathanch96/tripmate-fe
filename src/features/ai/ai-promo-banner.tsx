"use client"

import { useQuery } from "@tanstack/react-query"
import { ArrowRightIcon, CameraIcon, SparklesIcon, XIcon } from "lucide-react"
import Link from "next/link"
import { useSyncExternalStore } from "react"

import { buttonVariants } from "@/components/ui/button"
import { connectedAppsQuery } from "@/features/oauth/api"

const storageKey = "tripmate:ai-promo-dismissed"
const changeEvent = "tripmate:ai-promo-change"

// Dismissal is a per-browser convenience, never trip data. Storage can be unavailable (private
// mode, a blocked origin); then the banner simply stays until an app is connected.
function readDismissed() {
  try {
    return window.localStorage.getItem(storageKey) === "1"
  } catch {
    return false
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(changeEvent, onChange)
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(changeEvent, onChange)
    window.removeEventListener("storage", onChange)
  }
}

function dismiss() {
  try {
    window.localStorage.setItem(storageKey, "1")
  } catch {
    // Nothing to persist to; it reappears next visit.
  }
  window.dispatchEvent(new Event(changeEvent))
}

// Announces the AI assistant connector on the trips dashboard. It hides itself once the user has
// connected an app or dismissed it, and stays hidden during server rendering so it never flashes.
export function AiPromoBanner() {
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true)
  const apps = useQuery({ ...connectedAppsQuery(), enabled: !dismissed })
  if (dismissed || apps.isLoading || (apps.data?.length ?? 0) > 0) return null

  return (
    <aside aria-label="New feature" className="relative mb-6 overflow-hidden rounded-[18px] bg-[oklch(0.24_0.045_255)] p-5 text-white md:p-6">
      <div className="absolute -top-16 -right-16 size-48 rounded-full bg-[oklch(0.4_0.1_255_/_0.35)]" aria-hidden="true" />
      <button type="button" aria-label="Dismiss" onClick={dismiss} className="absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
        <XIcon className="size-4" />
      </button>
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center">
        <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-white/10"><CameraIcon className="size-6" /></span>
        <div className="min-w-0 flex-1 pr-6">
          <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.7_0.16_150)] px-2 py-0.5 text-[11px] font-extrabold text-[oklch(0.24_0.045_255)]">
            <SparklesIcon className="size-3" /> NEW
          </span>
          <p className="mt-2 font-heading text-lg font-extrabold">Split bills with Claude or ChatGPT</p>
          <p className="mt-1 text-sm text-white/75">Send your AI assistant a photo of the receipt, say who had what, and the split lands right here.</p>
        </div>
        <Link href="/ai" className={buttonVariants({ variant: "secondary", className: "shrink-0 font-bold" })}>
          See how <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </aside>
  )
}
