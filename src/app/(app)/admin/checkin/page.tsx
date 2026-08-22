import Link from "next/link";
import { prisma } from "@/lib/db";
import { now } from "@/lib/clock";
import { PageHeader } from "@/components/primitives";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckinBoard, type CheckinShift } from "@/components/client/CheckinBoard";
import { dayKey, fmtDay, fmtTimeRange, TZ } from "@/lib/dates";
import { formatInTimeZone } from "date-fns-tz";

export const metadata = { title: "Check-in · Admin" };
export const dynamic = "force-dynamic";

export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const [{ d }, currentTime] = await Promise.all([searchParams, now()]);

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

  // Day tabs: only days that actually have shifts. Without ?d=, open today if
  // it has shifts, otherwise the next shift day (or the last one, after the season).
  const days = [...new Set(allShifts.map((s) => dayKey(s.startsAt)))];
  const today = dayKey(currentTime);
  const day = d ?? days.find((k) => k >= today) ?? days[days.length - 1] ?? today;
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
    <div>
      <PageHeader title="Check-in" subtitle={label} />

      {days.length > 1 ? (
        <Tabs value={day} className="mb-5">
          <TabsList className="flex h-auto w-full flex-nowrap justify-start overflow-x-auto">
            {days.map((k) => {
              const sample = allShifts.find((s) => dayKey(s.startsAt) === k)!;
              return (
                <TabsTrigger key={k} value={k} asChild>
                  <Link href={`/admin/checkin?d=${k}`}>
                    {formatInTimeZone(sample.startsAt, TZ, "MMM d")}
                  </Link>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      ) : null}

      <CheckinBoard shifts={boardData} walkupCandidates={walkupCandidates} />
    </div>
  );
}
