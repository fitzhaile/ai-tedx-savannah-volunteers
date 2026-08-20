import Link from "next/link";
import { prisma } from "@/lib/db";
import { now } from "@/lib/clock";
import { getSettings } from "@/lib/clock";
import { sentTodayCount, queueDepth } from "@/lib/email/outbox";
import { Card, PageHeader, Badge, EmptyState, ButtonLink } from "@/components/ui";
import { fmtShiftWhen, fmtDateShort, fmtTime } from "@/lib/dates";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

function FillBar({ filled, capacity }: { filled: number; capacity: number }) {
  const pct = Math.min(100, Math.round((filled / Math.max(1, capacity)) * 100));
  const color = pct >= 100 ? "bg-go" : pct >= 60 ? "bg-warn" : "bg-ted";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-line">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-ink-soft">
        {filled}/{capacity}
      </span>
    </div>
  );
}

export default async function AdminDashboard() {
  const currentTime = await now();
  const [settings, volunteers, upcomingShifts, cancellations, sentToday, queued] =
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
    ]);

  const withFill = upcomingShifts.map((s) => ({
    ...s,
    filled: s.signups.filter((x) => x.status === "CONFIRMED" || x.status === "CHECKED_IN").length,
    waitlisted: s.signups.filter((x) => x.status === "WAITLISTED").length,
  }));
  const understaffed = withFill.filter((s) => s.filled < s.capacity && s.isPublished);
  const confirmedUpcoming = withFill.reduce((sum, s) => sum + s.filled, 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`It's ${fmtDateShort(currentTime)} · ${fmtTime(currentTime)} in Savannah`}
        action={<ButtonLink href="/admin/shifts/new" size="sm">+ New shift</ButtonLink>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="py-4">
          <p className="text-2xl font-extrabold text-ink">{volunteers}</p>
          <p className="text-xs font-semibold text-ink-soft">Active people</p>
        </Card>
        <Card className="py-4">
          <p className="text-2xl font-extrabold text-ink">{upcomingShifts.length}</p>
          <p className="text-xs font-semibold text-ink-soft">Upcoming shifts</p>
        </Card>
        <Card className="py-4">
          <p className="text-2xl font-extrabold text-ink">{confirmedUpcoming}</p>
          <p className="text-xs font-semibold text-ink-soft">Confirmed signups</p>
        </Card>
        <Card className="py-4">
          <p className="text-2xl font-extrabold text-ink">
            {sentToday}
            <span className="text-sm font-semibold text-ink-faint">
              /{settings.dailyEmailBudget}
            </span>
          </p>
          <p className="text-xs font-semibold text-ink-soft">Emails sent today</p>
        </Card>
      </div>

      {queued > 0 ? (
        <div className="mb-6 rounded-xl bg-warn-soft px-4 py-3 text-sm font-semibold text-warn">
          {queued} email{queued === 1 ? "" : "s"} waiting in the queue — they&apos;ll go out on
          the next scheduler run (within the daily limit).{" "}
          <Link href="/admin/messages" className="underline">
            View outbox
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-extrabold text-ink">Needs volunteers</h2>
          {understaffed.length === 0 ? (
            <EmptyState title="Every upcoming shift is fully staffed 🎉" />
          ) : (
            <div className="space-y-2">
              {understaffed.slice(0, 8).map((s) => (
                <Link key={s.id} href={`/admin/shifts/${s.id}`} className="block">
                  <Card className="flex items-center justify-between gap-3 py-3 transition-colors hover:border-ted">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{s.title}</p>
                      <p className="text-xs text-ink-soft">
                        {fmtShiftWhen(s.startsAt, s.endsAt)}
                        {s.owner ? ` · ${s.owner.name}` : ""}
                      </p>
                    </div>
                    <FillBar filled={s.filled} capacity={s.capacity} />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-extrabold text-ink">Recent cancellations</h2>
          {cancellations.length === 0 ? (
            <EmptyState title="No cancellations — enjoy it while it lasts" />
          ) : (
            <div className="space-y-2">
              {cancellations.map((c) => (
                <Card key={c.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink">
                        {c.user.name}{" "}
                        <span className="font-medium text-ink-soft">dropped</span> {c.shift.title}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {fmtShiftWhen(c.shift.startsAt, c.shift.endsAt)}
                      </p>
                      {c.cancelNote ? (
                        <p className="mt-1.5 border-l-2 border-warn pl-2 text-xs text-ink-soft italic">
                          “{c.cancelNote}”
                        </p>
                      ) : null}
                    </div>
                    {c.cancelledBy === "ADMIN" ? <Badge>Removed</Badge> : <Badge tone="amber">Self</Badge>}
                  </div>
                  <div className="mt-2 flex gap-3 text-xs font-bold">
                    <Link href={`/admin/shifts/${c.shiftId}`} className="text-ted hover:underline">
                      Open roster →
                    </Link>
                    <Link
                      href={`/admin/messages/new?user=${c.user.id}`}
                      className="text-ted hover:underline"
                    >
                      Message {c.user.name.split(" ")[0]} →
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
