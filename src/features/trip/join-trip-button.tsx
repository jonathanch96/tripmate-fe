"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

export function JoinTripButton({ code }: { code: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function join() {
    setPending(true);
    setError("");
    try {
      await apiFetch(`/api/trips/${code}/join`, { method: "POST" });
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to join trip");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6 space-y-2">
      <Button type="button" disabled={pending} onClick={join}>
        {pending ? "Joining…" : "Join trip"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
