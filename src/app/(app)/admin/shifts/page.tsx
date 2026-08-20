import Link from "next/link";
import { prisma } from "@/lib/db";
import { now } from "@/lib/clock";
import { Card, PageHeader, Badge, ButtonLink, EmptyState } from "@/components/ui";
import { fmtShiftWhen } from "@/lib/dates";
import { cn } from "@/lib/cn";

export const metadata = { title: "Shifts · Admin" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "understaffed", label: "Needs people" },
  { key: "EVENT", label: "Event" },
  { key: "COACHING", label: "Coaching" },
  { key: "GENERAL", label: "Other" },
  { key: "past", label: "Past" },
];

export default async function AdminShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const [{ filter = "all" }, currentTime] = await Promise.all([searchParams, now()]);
  const shifts = await prisma.shift.findMany({
    include: {
      signups: { select: { status: true } },
      owner: { select: { name: true } },
      slot: { select: { label: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  const rows = shifts
    .map((s) => ({
      ...s,
      filled: s.signups.filter((x) => x.status === "CONFIRMED" || x.status === "CHECKED_IN")
        .length,
      waitlisted: s.signups.filter((x) => x.status === "WAITLISTED").length,
      isPast: s.endsAt < currentTime,
    }))
    .filter((s) => {
      if (filter === "past") return s.isPast;
      if (s.isPast) return false;
      if (filter === "understaffed") return s.filled < s.capacity;
      if (filter === "EVENT" || filter === "COACHING" || filter === "GENERAL")
        return s.category === filter;
      return true;
    });

  return (
    <div>
      <PageHeader
        title="Shifts"
        subtitle="Create, edit, and staff every shift."
        action={<ButtonLink href="/admin/shifts/new" size="sm">+ New shift</ButtonLink>}
      />

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/admin/shifts" : `/admin/shifts?filter=${f.key}`}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-bold whitespace-nowrap",
              filter === f.key
                ? "border-ted bg-ted-soft text-ted-dark"
                : "border-line bg-card text-ink-soft hover:border-ink-faint"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No shifts match this filter" />
      ) : (
        <div className="space-y-2">
          {rows.map((s) => (
            <Link key={s.id} href={`/admin/shifts/${s.id}`} className="block">
              <Card className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors hover:border-ted">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-ink">{s.title}</p>
                    {s.category === "COACHING" ? <Badge tone="blue">Coaching</Badge> : null}
                    {!s.isPublished ? <Badge tone="amber">Hidden</Badge> : null}
                    {!s.slot && s.category !== "COACHING" ? <Badge>Custom time</Badge> : null}
                  </div>
                  <p className="text-xs text-ink-soft">
                    {fmtShiftWhen(s.startsAt, s.endsAt)}
                    {s.owner ? ` · ${s.owner.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {s.waitlisted > 0 ? <Badge tone="amber">+{s.waitlisted} waitlist</Badge> : null}
                  <Badge tone={s.filled >= s.capacity ? "green" : "red"}>
                    {s.filled}/{s.capacity} filled
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
