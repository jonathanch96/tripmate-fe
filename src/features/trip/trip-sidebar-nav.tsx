"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  FileCheck2,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { avatarColorFor, initialsOf } from "@/lib/avatar-colors";
import type { Participant, Trip } from "@/features/trip/types";

const NAV_ITEMS = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/settlements", label: "Settlement", icon: HandCoins },
  { href: "/final", label: "Final plan", icon: FileCheck2 },
  { href: "/settings", label: "Settings", icon: Settings },
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
    <aside className="sticky top-0 hidden h-dvh w-[250px] shrink-0 flex-col border-r bg-white px-[18px] py-6 md:flex">
      <Link href="/trips" className="mb-[22px] text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground">
        ‹ My trips
      </Link>
      <div className="mb-[26px]">
        <p className="truncate font-heading text-[19px] font-extrabold">{trip.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {tripCode} · {trip.baseCurrency}
        </p>
      </div>
      <nav aria-label="Trip navigation" className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const href = `${base}${item.href}`;
          const active = item.href === "" ? pathname === base : pathname.startsWith(href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground/80 hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-3">
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
        <Button
          variant="ghost"
          size="sm"
          className="h-auto justify-start gap-2 px-0 text-[13px] font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}

export function TripMobileNav({ tripCode, trip }: { tripCode: string; trip: Trip }) {
  const pathname = usePathname();
  const base = `/trip/${tripCode}`;

  return (
    <div className="border-b bg-white px-5 py-4 md:hidden">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <Link href="/trips" className="text-xs font-semibold text-muted-foreground">‹ My trips</Link>
          <p className="mt-1 truncate font-heading font-extrabold">{trip.name}</p>
        </div>
        <span className="text-xs text-muted-foreground">{tripCode} · {trip.baseCurrency}</span>
      </div>
      <nav aria-label="Trip navigation" className="flex gap-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
        const href = `${base}${item.href}`;
        const active = item.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "shrink-0 rounded-[9px] px-3 py-2 text-sm font-semibold transition-colors",
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )}
          >
            {item.label}
          </Link>
        );
        })}
      </nav>
    </div>
  );
}
