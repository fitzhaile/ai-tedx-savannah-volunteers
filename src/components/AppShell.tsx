import Link from "next/link";
import type { ReactNode } from "react";
import type { User } from "@prisma/client";
import { LogOut } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AppSidebar, type NavGroup } from "@/components/client/AppSidebar";
import { Wordmark } from "@/components/primitives";
import { signOutAction } from "@/lib/actions/auth-actions";
import { getSettings } from "@/lib/clock";
import { unreadCountForMember, totalUnreadForManager } from "@/lib/queries/threads";
import { TZ } from "@/lib/dates";

export async function AppShell({ user, children }: { user: User; children: ReactNode }) {
  const settings = await getSettings();
  const isManager = user.role === "MANAGER";
  const isBoard = user.role === "BOARD" || isManager;

  const groups: NavGroup[] = [];
  const mine: NavGroup = {
    label: "Volunteering",
    items: [
      { href: "/shifts", label: "Open shifts", icon: "calendar", exact: true },
      { href: "/me", label: "My shifts", icon: "mine", exact: true },
    ],
  };
  if (!isManager) {
    const unread = await unreadCountForMember(user.id);
    mine.items.push({ href: "/me/messages", label: "Messages", icon: "messages", badge: unread || undefined });
  }
  groups.push(mine);
  if (isBoard) {
    groups.push({
      label: "Board",
      items: [{ href: "/board", label: "My volunteers", icon: "users" }],
    });
  }
  if (isManager) {
    const unread = await totalUnreadForManager();
    const admin: NavGroup = {
      label: "Manage",
      items: [
        { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
        { href: "/admin/shifts", label: "Shifts", icon: "calendar" },
        { href: "/admin/slots", label: "Standard times", icon: "slots" },
        { href: "/admin/volunteers", label: "Volunteers", icon: "volunteer", badge: unread || undefined },
        { href: "/admin/board", label: "Board members", icon: "board" },
        { href: "/admin/messages", label: "Messages", icon: "mail" },
        { href: "/admin/checkin", label: "Check-in", icon: "checkin" },
      ],
    };
    if (process.env.ENABLE_TIME_TRAVEL === "true") {
      admin.items.push({ href: "/admin/dev", label: "Time travel", icon: "timer" });
    }
    groups.push(admin);
  }

  const footer = (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{user.name}</p>
        <p className="truncate text-xs text-white/50">{user.email}</p>
      </div>
      <form action={signOutAction}>
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          className="text-white/70 hover:bg-white/10 hover:text-white"
          title="Sign out"
        >
          <LogOut />
          <span className="sr-only">Sign out</span>
        </Button>
      </form>
    </div>
  );

  return (
    <SidebarProvider>
      <AppSidebar groups={groups} footer={footer} />
      <SidebarInset>
        {settings.simulatedNow ? (
          <div
            data-testid="time-travel-banner"
            className="bg-warn px-4 py-1.5 text-center text-xs font-bold text-white"
          >
            ⏱ Simulated time:{" "}
            {formatInTimeZone(settings.simulatedNow, TZ, "EEE, MMM d, yyyy · h:mm a")}
            {isManager ? (
              <>
                {" — "}
                <Link href="/admin/dev" className="underline">
                  time travel panel
                </Link>
              </>
            ) : null}
          </div>
        ) : null}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <SidebarTrigger />
          <div className="md:hidden">
            <Link href="/">
              <Wordmark />
            </Link>
          </div>
          <div className="ml-auto hidden text-sm text-muted-foreground md:block">
            Saturday, May 15, 2027
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-16 md:px-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
