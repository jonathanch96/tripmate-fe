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
  { href: "/settlements", label: "Settlements", icon: HandCoins },
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
    <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:gap-6">
      <div>
        <p className="truncate font-heading text-lg font-semibold">{trip.name}</p>
        <p className="mt-1 inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
          {tripCode}
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
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground"
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-3 border-t pt-4">
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
          className="justify-start gap-2 text-muted-foreground"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </Button>
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
