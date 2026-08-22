"use client";

import { ArrowLeftIcon, HandCoinsIcon, HouseIcon, MenuIcon, ReceiptTextIcon, ScrollTextIcon, UserPlusIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { avatarColorFor, initialsOf } from "@/lib/avatar-colors";
import { participantName } from "@/lib/participant-name";
import type { Participant, Trip } from "@/features/trip/types";

const NAV_ITEMS = [
  { href: "", label: "Overview" },
  { href: "/expenses", label: "Expenses" },
  { href: "/settlements", label: "Settlements" },
  { href: "/ledger", label: "Ledger" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
] as const;

const MOBILE_NAV_ITEMS = [
  { href: "", label: "Overview", icon: HouseIcon },
  { href: "/expenses", label: "Expenses", icon: ReceiptTextIcon },
  { href: "/settlements", label: "Settle", icon: HandCoinsIcon },
  { href: "/ledger", label: "Ledger", icon: ScrollTextIcon },
  { href: "/settings", label: "More", icon: MenuIcon },
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
            const name = participantName(participant);
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

export function TripMobileNav({ tripCode, trip }: { tripCode: string; trip: Trip }) {
  const pathname = usePathname();
  const base = `/trip/${tripCode}`;

  const isMobileActive = (href: string) => {
    if (href === "") return pathname === base;
    if (href === "/settings") {
      return pathname.startsWith(`${base}/settings`)
        || pathname.startsWith(`${base}/analytics`)
        || pathname.startsWith(`${base}/final`);
    }
    return pathname.startsWith(`${base}${href}`);
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex min-h-[74px] items-center gap-3 border-b border-border bg-white/95 px-4 backdrop-blur md:hidden">
        <Link href="/trips" aria-label="Back to trips" className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground active:bg-muted">
          <ArrowLeftIcon className="size-6" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-[20px] font-extrabold leading-tight">{trip.name}</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold tracking-wide text-muted-foreground">{tripCode} · {trip.baseCurrency}</p>
        </div>
        <Link href={`${base}/settings?section=members`} aria-label="Invite members" className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground active:bg-muted">
          <UserPlusIcon className="size-5.5" />
        </Link>
      </header>

      <nav
        aria-label="Trip navigation"
        className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-50 grid h-[68px] grid-cols-5 border-t border-border bg-white/95 px-1 backdrop-blur md:hidden"
      >
        {MOBILE_NAV_ITEMS.map((item) => {
          const href = `${base}${item.href}`;
          const active = isMobileActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
