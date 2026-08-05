import "server-only";

import { NextRequest } from "next/server";

import type { Participant, Trip } from "@/features/trip/types";
import { authenticatedBackendFetch } from "@/lib/server/authenticated-backend";

type TripPageData =
  | { status: "found"; trip: Trip; participants: Participant[] }
  | { status: "not-found" | "no-access" };

export async function loadTripPageData(
  incomingHeaders: HeadersInit,
  tripCode: string,
): Promise<TripPageData> {
  const request = new NextRequest("http://internal/trip", { headers: incomingHeaders });
  const tripResult = await authenticatedBackendFetch<Trip>(request, `/trips/${tripCode}`);

  if (tripResult.status === 404) return { status: "not-found" };
  if (!tripResult.envelope.success || !tripResult.envelope.data) {
    return { status: "no-access" };
  }

  const participantsResult = await authenticatedBackendFetch<Participant[]>(
    request,
    `/trips/${tripCode}/participants`,
  );
  return {
    status: "found",
    trip: tripResult.envelope.data,
    participants: participantsResult.envelope.data ?? [],
  };
}
