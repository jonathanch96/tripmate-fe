"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { apiFetch } from "@/lib/api-client"
import { apiErrorMessage } from "@/lib/envelope"
import { qk } from "@/lib/query-keys"

export function ArchivedBanner({ tripCode, canRestore }: { tripCode: string; canRestore: boolean }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const restore = useMutation({
    mutationFn: () => apiFetch(`/api/trips/${tripCode}/unarchive`, { method: "POST" }),
    onSuccess: async () => {
      toast.success("Trip restored")
      await queryClient.invalidateQueries({ queryKey: qk.trip(tripCode) })
      router.refresh()
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not restore the trip")),
  })

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900 md:px-12 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <span>This trip is archived. Restore it to add expenses or make changes.</span>
      {canRestore ? (
        <Button size="sm" variant="outline" disabled={restore.isPending} onClick={() => restore.mutate()}>
          {restore.isPending ? <Spinner className="mr-1.5" /> : "↺ "}Restore trip
        </Button>
      ) : null}
    </div>
  )
}
