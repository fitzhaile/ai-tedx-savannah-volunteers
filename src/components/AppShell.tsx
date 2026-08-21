import Link from "next/link";
import type { User } from "@prisma/client";
import { Wordmark } from "@/components/ui";
import { NavLinks } from "@/components/client/NavLinks";
import { signOutAction } from "@/lib/actions/auth-actions";
import { homeFor } from "@/lib/auth";
import { getSettings } from "@/lib/clock";
import { unreadCountForMember } from "@/lib/queries/threads";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/dates";
import type { ReactNode } from "react";

export async function AppShell({ user, children }: { user: User; children: ReactNode }) {
  const settings = await getSettings();
  const links: { href: string; label: string; badge?: number }[] = [
    { href: "/shifts", label: "Shifts" },
    { href: "/me", label: "My shifts" },
  ];
  if (user.role !== "MANAGER") {
    const unread = await unreadCountForMember(user.id);
    links.push({ href: "/me/messages", label: "Messages", badge: unread || undefined });
  }
  if (user.role === "BOARD" || user.role === "MANAGER") {
    links.push({ href: "/board", label: "My volunteers" });
  }
  if (user.role === "MANAGER") {
    links.push({ href: "/admin", label: "Admin" });
  }

  return (
    <div className="min-h-screen">
      {settings.simulatedNow ? (
        <div
          data-testid="time-travel-banner"
          className="bg-warn px-4 py-1.5 text-center text-xs font-bold text-white"
        >
          ⏱ Simulated time:{" "}
          {formatInTimeZone(settings.simulatedNow, TZ, "EEE, MMM d, yyyy · h:mm a")}
          {user.role === "MANAGER" ? (
            <>
              {" — "}
              <Link href="/admin/dev" className="underline">
                time travel panel
              </Link>
            </>
          ) : null}
        </div>
      ) : null}
      <header className="sticky top-0 z-40 bg-ink text-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href={homeFor(user)} className="shrink-0">
            <Wordmark inverse />
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-white/60 sm:block">{user.name}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-xs font-bold tracking-wide text-white/70 uppercase transition-colors hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto max-w-5xl overflow-x-auto px-4">
          <NavLinks links={links} />
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 pb-20">{children}</main>
    </div>
  );
}
