import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { JoinTripButton } from "@/features/trip/join-trip-button";
import { TripProvider } from "@/features/trip/trip-context";
import { TripMobileNav, TripSidebarNav } from "@/features/trip/trip-sidebar-nav";
import { loadTripPageData } from "@/lib/trip-page-data";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripCode: string }>;
}) {
  const { tripCode } = await params;
  const incoming = await headers();
  const result = await loadTripPageData(incoming, tripCode);

  if (result.status !== "found") {
    if (result.status === "not-found") notFound();
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h1 className="text-2xl font-semibold">Request access</h1>
        <p className="mt-2 text-muted-foreground">
          You are not a member of trip <strong>{tripCode}</strong>.
        </p>
        <JoinTripButton code={tripCode} />
      </div>
    );
  }

  const { trip, participants } = result;

  return (
    <TripProvider trip={trip} participants={participants}>
      <TripMobileNav tripCode={tripCode} />
      <div className="flex gap-8">
        <TripSidebarNav tripCode={tripCode} trip={trip} participants={participants} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </TripProvider>
  );
}
