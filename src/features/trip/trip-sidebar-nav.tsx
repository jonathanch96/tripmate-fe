"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { avatarColorFor, initialsOf } from "@/lib/avatar-colors";
import type { Participant, Trip } from "@/features/trip/types";

const NAV_ITEMS = [
  { href: "", label: "Overview" },
  { href: "/expenses", label: "Expenses" },
  { href: "/settlements", label: "Settlements" },
  { href: "/final", label: "Final plan" },
  { href: "/settings", label: "Settings" },
] as const;

const VISIBLE_MEMBERS = 5;

export function TripSidebarNav({
  tripCode,
  trip,
  participants,
}: {
  tripCode: string;
  trip: Trip;
  participants: Participant[];
}) {
  const pathname = usePathname();
  const base = `/trip/${tripCode}`;
  const visible = participants.slice(0, VISIBLE_MEMBERS);
  const overflow = participants.length - visible.length;

  return (
    <aside className="hidden shrink-0 flex-col border-r border-border bg-white p-[18px] pt-6 md:flex md:w-[250px]">
      <Link href="/trips" className="mb-[22px] text-[13px] font-semibold text-muted-foreground hover:text-foreground">
        ‹ My trips
      </Link>
      <p className="truncate font-heading text-[19px] font-extrabold">{trip.name}</p>
      <p className="mb-[26px] text-xs text-muted-foreground">
        {tripCode} · {trip.baseCurrency}
      </p>
      <nav aria-label="Trip navigation" className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const href = `${base}${item.href}`;
          const active = item.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "rounded-[9px] px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-[oklch(0.35_0.01_60)] hover:bg-muted"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-3.5">
        <AvatarGroup>
          {visible.map((participant) => {
            const name = participant.user?.name ?? participant.user?.email ?? "?";
            return (
              <Avatar key={participant.id} size="sm" title={name}>
                <AvatarFallback className={avatarColorFor(name)}>{initialsOf(name)}</AvatarFallback>
              </Avatar>
            );
          })}
          {overflow > 0 ? (
            <AvatarGroupCount className="size-6 text-xs">+{overflow}</AvatarGroupCount>
          ) : null}
        </AvatarGroup>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-fit text-[13px] font-semibold text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function TripMobileNav({ tripCode }: { tripCode: string }) {
  const pathname = usePathname();
  const base = `/trip/${tripCode}`;

  return (
    <nav
      aria-label="Trip navigation"
      className="mb-6 flex gap-1 overflow-x-auto border-b pb-2 md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const href = `${base}${item.href}`;
        const active = item.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors",
              active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
