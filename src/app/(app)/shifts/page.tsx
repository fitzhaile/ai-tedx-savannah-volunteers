import { requireUser } from "@/lib/auth";
import { now } from "@/lib/clock";
import { getShiftBoard } from "@/lib/queries/shifts";
import { ShiftCard } from "@/components/ShiftCard";
import { ClaimCard } from "@/components/client/ClaimCard";
import { PageHeader, EmptyState, Badge } from "@/components/ui";
import { dayKey, fmtDay, fmtShiftWhen } from "@/lib/dates";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/dates";

export const metadata = { title: "Shifts" };
export const dynamic = "force-dynamic";

const EVENT_DAY = "2027-05-15";

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; claim?: string }>;
}) {
  const user = await requireUser();
  const [{ welcome, claim }, currentTime] = await Promise.all([searchParams, now()]);
  const board = await getShiftBoard(user.id, currentTime);

  const claimShift = claim ? board.find((s) => s.id === claim) : null;

  const regular = board.filter((s) => s.category !== "COACHING");
  const coaching = board.filter((s) => s.category === "COACHING");

  const dayGroups = new Map<string, typeof regular>();
  for (const s of regular) {
    const k = dayKey(s.startsAt);
    if (!dayGroups.has(k)) dayGroups.set(k, []);
    dayGroups.get(k)!.push(s);
  }
  const coachingGroups = new Map<string, typeof coaching>();
  for (const s of coaching) {
    const k = dayKey(s.startsAt);
    if (!coachingGroups.has(k)) coachingGroups.set(k, []);
    coachingGroups.get(k)!.push(s);
  }

  const dayChips = [...dayGroups.keys()].map((k) => ({
    id: `d-${k}`,
    label: formatInTimeZone(dayGroups.get(k)![0].startsAt, TZ, "EEE, MMM d"),
  }));
  if (coaching.length > 0) dayChips.push({ id: "coaching", label: "Speaker Coaching" });

  return (
    <div>
      {welcome ? (
        <div className="mb-5 rounded-xl bg-go-soft p-4 text-sm">
          <p className="font-bold text-ink">You&apos;re in! 🎉</p>
          <p className="mt-0.5 text-ink-soft">
            Grab any shifts below — you&apos;ll get a confirmation email for each one.
          </p>
        </div>
      ) : null}
      {claimShift ? (
        <ClaimCard
          shiftId={claimShift.id}
          shiftTitle={claimShift.title}
          when={fmtShiftWhen(claimShift.startsAt, claimShift.endsAt)}
        />
      ) : null}

      <PageHeader
        title="Open shifts"
        subtitle="First come, first served — spots are limited on every shift."
      />

      {dayChips.length > 1 ? (
        <div className="sticky top-24 z-30 -mx-4 mb-6 overflow-x-auto bg-paper/95 px-4 py-2 backdrop-blur">
          <div className="flex gap-2">
            {dayChips.map((c) => (
              <a
                key={c.id}
                href={`#${c.id}`}
                className="rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-bold whitespace-nowrap text-ink-soft hover:border-ted hover:text-ted"
              >
                {c.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {board.length === 0 ? (
        <EmptyState
          title="No open shifts right now"
          hint="New shifts appear here as the event approaches — watch your email."
        />
      ) : null}

      <div className="space-y-10">
        {[...dayGroups.entries()].map(([k, shifts]) => (
          <section key={k} id={`d-${k}`} className="scroll-mt-28">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-ink">{fmtDay(shifts[0].startsAt)}</h2>
              {k === EVENT_DAY ? <Badge tone="red">Event Day</Badge> : null}
            </div>
            <div className="space-y-3">
              {shifts.map((s) => (
                <ShiftCard key={s.id} shift={s} past={s.endsAt < currentTime} />
              ))}
            </div>
          </section>
        ))}

        {coaching.length > 0 ? (
          <section id="coaching" className="scroll-mt-28">
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-ink">Speaker Coaching</h2>
              <Badge tone="blue">March–April</Badge>
            </div>
            <p className="mb-4 text-sm text-ink-soft">
              Evening sessions helping our speakers rehearse in the months before the
              event. Low-key, fascinating, and a great way to meet the speakers early.
            </p>
            <div className="space-y-6">
              {[...coachingGroups.entries()].map(([k, shifts]) => (
                <div key={k}>
                  <h3 className="mb-2 text-sm font-bold text-ink-soft">
                    {fmtDay(shifts[0].startsAt)}
                  </h3>
                  <div className="space-y-3">
                    {shifts.map((s) => (
                      <ShiftCard key={s.id} shift={s} past={s.endsAt < currentTime} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
