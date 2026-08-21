import Link from "next/link";
import { prisma } from "@/lib/db";
import { now } from "@/lib/clock";
import { PageHeader } from "@/components/primitives";
import { CheckinBoard, type CheckinShift } from "@/components/client/CheckinBoard";
import { dayKey, fmtDay, fmtTimeRange } from "@/lib/dates";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/dates";
import { cn } from "@/lib/cn";

export const metadata = { title: "Check-in · Admin" };
export const dynamic = "force-dynamic";

export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const [{ d }, currentTime] = await Promise.all([searchParams, now()]);
  const day = d ?? dayKey(currentTime);

  const allShifts = await prisma.shift.findMany({
    where: { isPublished: true },
    include: {
      signups: {
        where: { status: { in: ["CONFIRMED", "CHECKED_IN", "NO_SHOW"] } },
        include: { user: { select: { name: true, phone: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  // Day chips: only days that actually have shifts.
  const days = [...new Set(allShifts.map((s) => dayKey(s.startsAt)))];
  const dayShifts = allShifts.filter((s) => dayKey(s.startsAt) === day);

  const boardData: CheckinShift[] = dayShifts.map((s) => ({
    id: s.id,
    title: s.title,
    timeRange: fmtTimeRange(s.startsAt, s.endsAt),
    entries: s.signups.map((x) => ({
      signupId: x.id,
      userId: x.userId,
      name: x.user.name,
      phone: x.user.phone,
      status: x.status as "CONFIRMED" | "CHECKED_IN" | "NO_SHOW",
    })),
  }));

  const onDayUserIds = new Set(dayShifts.flatMap((s) => s.signups.map((x) => x.userId)));
  const walkupCandidates = (
    await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
  ).filter((u) => !onDayUserIds.has(u.id));

  const label = dayShifts[0] ? fmtDay(dayShifts[0].startsAt) : day;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Check-in" subtitle={label} />

      {days.length > 1 ? (
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {days.map((k) => {
            const sample = allShifts.find((s) => dayKey(s.startsAt) === k)!;
            return (
              <Link
                key={k}
                href={`/admin/checkin?d=${k}`}
                className={cn(
                  "rounded-full border-2 px-3.5 py-1 text-xs font-extrabold whitespace-nowrap transition-colors",
                  k === day
                    ? "border-ink bg-ink text-white"
                    : "border-ink text-ink hover:bg-ink hover:text-white"
                )}
              >
                {formatInTimeZone(sample.startsAt, TZ, "EEE, MMM d")}
              </Link>
            );
          })}
        </div>
      ) : null}

      <CheckinBoard shifts={boardData} walkupCandidates={walkupCandidates} />
    </div>
  );
}
