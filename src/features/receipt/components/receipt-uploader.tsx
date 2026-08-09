"use client"

import { useRef, useState } from "react"
import { Camera, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

const allowed = ["image/jpeg", "image/png", "image/webp"]
export function ReceiptUploader({ pending, onSelect }: { pending: boolean; onSelect: (file: File, preview: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState("")
  function choose(file?: File) {
    if (!file) return
    if (!allowed.includes(file.type)) { setError("Choose a JPEG, PNG, or WebP image."); return }
    if (file.size > 10 * 1024 * 1024) { setError("The receipt image must be 10 MB or smaller."); return }
    setError(""); onSelect(file, URL.createObjectURL(file))
  }
  return <div className="space-y-3">
    <button type="button" disabled={pending} onClick={() => input.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); choose(event.dataTransfer.files[0]) }} className="flex min-h-44 w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-muted/20 p-6 text-center hover:bg-muted/40 disabled:opacity-60">
      <span className="rounded-full bg-primary/10 p-3 text-primary"><Camera className="size-6" /></span>
      <span><span className="block font-medium">Photograph or drop a receipt</span><span className="text-xs text-muted-foreground">JPEG, PNG, or WebP · max 10 MB</span></span>
      <Button type="button" variant="outline" tabIndex={-1}><Upload /> Choose image</Button>
    </button>
    <input ref={input} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => choose(event.target.files?.[0])} />
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
  </div>
}
