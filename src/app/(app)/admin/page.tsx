import Link from "next/link";
import { Users, CalendarDays, ClipboardCheck, Mail, MessageSquare, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { now, getSettings } from "@/lib/clock";
import { sentTodayCount, queueDepth } from "@/lib/email/outbox";
import { totalUnreadForManager } from "@/lib/queries/threads";
import { PageHeader, Badge, ButtonLink, EmptyState } from "@/components/primitives";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fmtShiftWhen, fmtDateShort, fmtTime } from "@/lib/dates";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const currentTime = await now();
  const [settings, volunteers, upcomingShifts, cancellations, sentToday, queued, unreadMessages] =
    await Promise.all([
      getSettings(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.shift.findMany({
        where: { endsAt: { gte: currentTime } },
        include: { signups: { select: { status: true } }, owner: { select: { name: true } } },
        orderBy: { startsAt: "asc" },
      }),
      prisma.signup.findMany({
        where: { status: "CANCELLED" },
        include: { user: { select: { name: true, id: true } }, shift: true },
        orderBy: { cancelledAt: "desc" },
        take: 8,
      }),
      sentTodayCount(),
      queueDepth(),
      totalUnreadForManager(),
    ]);

  const withFill = upcomingShifts.map((s) => ({
    ...s,
    filled: s.signups.filter((x) => x.status === "CONFIRMED" || x.status === "CHECKED_IN").length,
  }));
  const understaffed = withFill.filter((s) => s.filled < s.capacity && s.isPublished);
  const confirmedUpcoming = withFill.reduce((sum, s) => sum + s.filled, 0);
  const openSpots = understaffed.reduce((sum, s) => sum + (s.capacity - s.filled), 0);

  const stats = [
    { label: "Active people", value: String(volunteers), icon: Users, href: "/admin/volunteers" },
    { label: "Upcoming shifts", value: String(upcomingShifts.length), icon: CalendarDays, href: "/admin/shifts" },
    { label: "Confirmed signups", value: String(confirmedUpcoming), icon: ClipboardCheck, href: "/admin/shifts" },
    { label: "Emails sent today", value: `${sentToday}`, suffix: `/ ${settings.dailyEmailBudget}`, icon: Mail, href: "/admin/messages" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={`${fmtDateShort(currentTime)} · ${fmtTime(currentTime)} in Savannah`}
        title={
          understaffed.length === 0
            ? "Every upcoming shift is staffed."
            : `${understaffed.length} of ${upcomingShifts.length} upcoming shifts still need ${openSpots} ${openSpots === 1 ? "person" : "people"}.`
        }
        action={<ButtonLink href="/admin/shifts/new" size="sm">+ New shift</ButtonLink>}
      />

      {unreadMessages > 0 ? (
        <Alert className="mb-6">
          <MessageSquare />
          <AlertTitle>
            {unreadMessages} unread message{unreadMessages === 1 ? "" : "s"} from volunteers
          </AlertTitle>
          <AlertDescription>
            <Link href="/admin/volunteers" className="font-semibold text-ted hover:underline">
              Open the volunteer list →
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}
      {queued > 0 ? (
        <Alert className="mb-6 border-warn/30 bg-warn-soft">
          <Mail className="text-warn" />
          <AlertTitle>
            {queued} email{queued === 1 ? "" : "s"} waiting in the queue
          </AlertTitle>
          <AlertDescription>
            They go out on the next scheduler run, within the daily limit.{" "}
            <Link href="/admin/messages" className="font-semibold text-ted hover:underline">
              View outbox →
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="gap-2 py-4 transition-colors hover:border-ted/50">
              <CardHeader className="flex items-center justify-between px-4">
                <CardDescription className="text-xs font-semibold tracking-wide uppercase">
                  {s.label}
                </CardDescription>
                <s.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4">
                <p className="font-display text-3xl font-bold text-foreground">
                  {s.value}
                  {s.suffix ? (
                    <span className="ml-1 text-sm font-semibold text-muted-foreground">{s.suffix}</span>
                  ) : null}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">
              <h2>Needs volunteers</h2>
            </CardTitle>
            <CardDescription>Upcoming shifts with open spots, soonest first.</CardDescription>
          </CardHeader>
          <CardContent>
            {understaffed.length === 0 ? (
              <EmptyState title="Every upcoming shift is fully staffed 🎉" />
            ) : (
              <ul className="divide-y">
                {understaffed.slice(0, 8).map((s) => (
                  <li key={s.id} className="py-4 first:pt-0 last:pb-0">
                    <Link href={`/admin/shifts/${s.id}`} className="group flex items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground group-hover:text-ted">
                          {s.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {fmtShiftWhen(s.startsAt, s.endsAt)}
                          {s.owner ? ` · ${s.owner.name}` : ""}
                        </p>
                      </div>
                      <div className="w-28 shrink-0">
                        <Progress value={Math.round((s.filled / s.capacity) * 100)} className="h-1.5" />
                        <p className="mt-1 text-right text-xs font-semibold text-muted-foreground">
                          {s.filled}/{s.capacity}
                        </p>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">
              <h2>Recent cancellations</h2>
            </CardTitle>
            <CardDescription>Who dropped what, and why — so you can backfill.</CardDescription>
          </CardHeader>
          <CardContent>
            {cancellations.length === 0 ? (
              <EmptyState title="No cancellations — enjoy it while it lasts" />
            ) : (
              <ul className="divide-y">
                {cancellations.map((c) => (
                  <li key={c.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {c.user.name}{" "}
                          <span className="font-normal text-muted-foreground">dropped</span>{" "}
                          {c.shift.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fmtShiftWhen(c.shift.startsAt, c.shift.endsAt)}
                        </p>
                        {c.cancelNote ? (
                          <p className="mt-1.5 border-l-2 border-warn pl-2 text-xs text-muted-foreground italic">
                            “{c.cancelNote}”
                          </p>
                        ) : null}
                      </div>
                      {c.cancelledBy === "ADMIN" ? <Badge>Removed</Badge> : <Badge tone="amber">Self</Badge>}
                    </div>
                    <div className="mt-2 flex gap-3 text-xs font-semibold">
                      <Link href={`/admin/shifts/${c.shiftId}`} className="text-ted hover:underline">
                        Open roster →
                      </Link>
                      <Link href={`/admin/volunteers/${c.user.id}`} className="text-ted hover:underline">
                        Message {c.user.name.split(" ")[0]} →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
