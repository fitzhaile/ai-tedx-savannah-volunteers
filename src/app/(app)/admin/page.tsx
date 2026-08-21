import Link from "next/link";
import { prisma } from "@/lib/db";
import { now } from "@/lib/clock";
import { getSettings } from "@/lib/clock";
import { sentTodayCount, queueDepth } from "@/lib/email/outbox";
import { totalUnreadForManager } from "@/lib/queries/threads";
import { Card, PageHeader, Badge, EmptyState, ButtonLink, SectionTitle } from "@/components/ui";
import { fmtShiftWhen, fmtDateShort, fmtTime } from "@/lib/dates";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

function FillBar({ filled, capacity }: { filled: number; capacity: number }) {
  const pct = Math.min(100, Math.round((filled / Math.max(1, capacity)) * 100));
  const color = pct >= 100 ? "bg-ink" : pct >= 60 ? "bg-warn" : "bg-ted";
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
    waitlisted: s.signups.filter((x) => x.status === "WAITLISTED").length,
  }));
  const understaffed = withFill.filter((s) => s.filled < s.capacity && s.isPublished);
  const confirmedUpcoming = withFill.reduce((sum, s) => sum + s.filled, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Volunteer manager"
        title="Dashboard"
        subtitle={`It's ${fmtDateShort(currentTime)} · ${fmtTime(currentTime)} in Savannah`}
        action={<ButtonLink href="/admin/shifts/new" size="sm">+ New shift</ButtonLink>}
      />

      <div className="mb-8 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
        {[
          { n: String(volunteers), label: "Active people" },
          { n: String(upcomingShifts.length), label: "Upcoming shifts" },
          { n: String(confirmedUpcoming), label: "Confirmed signups" },
          { n: `${sentToday}`, label: "Emails sent today", suffix: `/${settings.dailyEmailBudget}` },
        ].map((t) => (
          <div key={t.label} className="border-t-2 border-ink pt-3">
            <p className="font-display text-4xl leading-none font-extrabold text-ink">
              {t.n}
              {t.suffix ? (
                <span className="text-base font-bold text-ink-faint">{t.suffix}</span>
              ) : null}
            </p>
            <p className="eyebrow mt-2 text-ink-faint">{t.label}</p>
          </div>
        ))}
      </div>

      {unreadMessages > 0 ? (
        <div className="mb-6 rounded-xl bg-ted/10 px-4 py-3 text-sm font-semibold text-ted">
          💬 {unreadMessages} unread message{unreadMessages === 1 ? "" : "s"} from volunteers.{" "}
          <Link href="/admin/volunteers" className="underline">
            View volunteers
          </Link>
        </div>
      ) : null}

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
          <SectionTitle>Needs volunteers</SectionTitle>
          {understaffed.length === 0 ? (
            <EmptyState title="Every upcoming shift is fully staffed 🎉" />
          ) : (
            <div className="space-y-2">
              {understaffed.slice(0, 8).map((s) => (
                <Link key={s.id} href={`/admin/shifts/${s.id}`} className="block">
                  <Card className="flex items-center justify-between gap-3 rounded-none border-x-0 border-t-0 px-0 py-3 transition-colors hover:bg-paper-2">
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
          <SectionTitle>Recent cancellations</SectionTitle>
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
                      href={`/admin/volunteers/${c.user.id}`}
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
