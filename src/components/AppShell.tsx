import Link from "next/link";
import type { User } from "@prisma/client";
import { Wordmark, Button } from "@/components/ui";
import { NavLinks } from "@/components/client/NavLinks";
import { signOutAction } from "@/lib/actions/auth-actions";
import { homeFor } from "@/lib/auth";
import { getSettings } from "@/lib/clock";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/dates";
import type { ReactNode } from "react";

export async function AppShell({ user, children }: { user: User; children: ReactNode }) {
  const settings = await getSettings();
  const links: { href: string; label: string }[] = [
    { href: "/shifts", label: "Shifts" },
    { href: "/me", label: "My shifts" },
  ];
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
      <header className="sticky top-0 z-40 border-b border-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href={homeFor(user)}>
            <Wordmark />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-soft sm:block">{user.name}</span>
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
        <nav className="mx-auto max-w-5xl overflow-x-auto px-4">
          <NavLinks links={links} />
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-16">{children}</main>
    </div>
  );
}
