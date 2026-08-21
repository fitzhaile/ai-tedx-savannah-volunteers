import { requireUser } from "@/lib/auth";
import { now } from "@/lib/clock";
import { getShiftBoard } from "@/lib/queries/shifts";
import { ShiftCard } from "@/components/ShiftCard";
import { ClaimCard } from "@/components/client/ClaimCard";
import { PageHeader, EmptyState, Badge } from "@/components/ui";
import { dayKey, fmtShiftWhen } from "@/lib/dates";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/dates";

export const metadata = { title: "Shifts" };
export const dynamic = "force-dynamic";

const EVENT_DAY = "2027-05-15";

/** Calendar-style day masthead: big numeral, weekday, month. */
function DayMasthead({ date, tag }: { date: Date; tag?: React.ReactNode }) {
  return (
    <div className="mb-1 flex items-end gap-4 border-t-4 border-ink pt-3">
      <span className="font-display text-6xl leading-none font-extrabold text-ink">
        {formatInTimeZone(date, TZ, "d")}
      </span>
      <div className="pb-1">
        <p className="eyebrow text-ted">{formatInTimeZone(date, TZ, "EEEE")}</p>
        <p className="font-display text-lg leading-tight font-extrabold text-ink">
          {formatInTimeZone(date, TZ, "MMMM yyyy")}
        </p>
      </div>
      {tag ? <div className="pb-2">{tag}</div> : null}
    </div>
  );
}

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
    label: formatInTimeZone(dayGroups.get(k)![0].startsAt, TZ, "EEE d"),
  }));
  if (coaching.length > 0) dayChips.push({ id: "coaching", label: "Coaching" });

  const openSpots = board.reduce((n, s) => n + Math.max(0, s.capacity - s.filled), 0);

  return (
    <div>
      {welcome ? (
        <div className="mb-6 border-l-4 border-ted bg-ted-soft px-4 py-3 text-sm">
          <p className="font-display font-extrabold text-ink">You&apos;re in.</p>
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
        eyebrow="Volunteer shifts"
        title="Open shifts"
        subtitle={`First come, first served — ${openSpots} spot${openSpots === 1 ? "" : "s"} still open across ${board.length} shift${board.length === 1 ? "" : "s"}.`}
      />

      {dayChips.length > 1 ? (
        <div className="sticky top-[5.75rem] z-30 -mx-4 mb-8 overflow-x-auto bg-paper/95 px-4 py-2 backdrop-blur">
          <div className="flex gap-2">
            {dayChips.map((c) => (
              <a
                key={c.id}
                href={`#${c.id}`}
                className="rounded-full border-2 border-ink px-3.5 py-1 text-xs font-extrabold whitespace-nowrap text-ink transition-colors hover:bg-ink hover:text-white"
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

      <div className="space-y-14">
        {[...dayGroups.entries()].map(([k, shifts]) => (
          <section key={k} id={`d-${k}`} className="scroll-mt-36">
            <DayMasthead
              date={shifts[0].startsAt}
              tag={k === EVENT_DAY ? <Badge tone="red">Event day</Badge> : null}
            />
            <div>
              {shifts.map((s) => (
                <ShiftCard key={s.id} shift={s} past={s.endsAt < currentTime} />
              ))}
            </div>
          </section>
        ))}

        {coaching.length > 0 ? (
          <section id="coaching" className="scroll-mt-36">
            <div className="border-t-4 border-ink pt-3">
              <p className="eyebrow text-ted">March – April</p>
              <h2 className="mt-1 font-display text-3xl font-extrabold text-ink">
                Speaker Coaching
              </h2>
              <p className="mt-2 max-w-prose text-sm text-ink-soft">
                Evening sessions helping our speakers rehearse in the months before the
                event. Low-key, fascinating, and a great way to meet the speakers early.
              </p>
            </div>
            <div className="mt-6 space-y-10">
              {[...coachingGroups.entries()].map(([k, shifts]) => (
                <div key={k}>
                  <p className="mb-1 font-display text-base font-extrabold text-ink">
                    {formatInTimeZone(shifts[0].startsAt, TZ, "EEEE, MMMM d")}
                  </p>
                  <div>
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
