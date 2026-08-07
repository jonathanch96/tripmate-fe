import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JoinTripButton } from "@/features/trip/join-trip-button";
import { TripProvider } from "@/features/trip/trip-context";
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
      <header className="mb-8 flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-semibold">{trip.name}</h1>
          <p className="text-sm text-muted-foreground">{tripCode}</p>
        </div>
        <nav className="flex gap-4 text-sm">
          <Link href={`/trip/${tripCode}`}>Overview</Link>
          <Link href={`/trip/${tripCode}/expenses`}>Expenses</Link>
          <Link href={`/trip/${tripCode}/settlements`}>Settlements</Link>
          <Link href={`/trip/${tripCode}/final`}>Final plan</Link>
          <Link href={`/trip/${tripCode}/settings`}>Settings</Link>
        </nav>
      </header>
      {children}
    </TripProvider>
  );
}
