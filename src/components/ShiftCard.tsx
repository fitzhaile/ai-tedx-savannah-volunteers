import type { Shift } from "@prisma/client";
import { Badge } from "@/components/ui";
import { CapacityPill } from "@/components/CapacityPill";
import { SignupControls, type MySignupInfo } from "@/components/client/SignupControls";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/dates";

export interface ShiftBoardItem extends Shift {
  owner: { name: string } | null;
  filled: number;
  my: MySignupInfo | null;
}

/** A shift as an editorial list row: time column, details, capacity + action. */
export function ShiftCard({ shift, past }: { shift: ShiftBoardItem; past: boolean }) {
  const full = shift.filled >= shift.capacity;
  const start = formatInTimeZone(shift.startsAt, TZ, "h:mm");
  const startMeridiem = formatInTimeZone(shift.startsAt, TZ, "a");
  const end = formatInTimeZone(shift.endsAt, TZ, "h:mm a");
  const mine = shift.my && shift.my.status !== "CANCELLED" && shift.my.status !== "NO_SHOW";

  return (
    <article
      className={
        "grid gap-4 border-t border-line py-5 sm:grid-cols-[6.5rem_1fr_auto] sm:gap-6 " +
        (mine ? "bg-ted-soft/40 -mx-4 px-4 sm:mx-0 sm:bg-transparent sm:px-0" : "")
      }
    >
      <div className="flex items-baseline gap-2 sm:block">
        <p className="font-display text-2xl leading-none font-extrabold text-ink">
          {start}
          <span className="ml-0.5 text-sm font-bold text-ink-faint">{startMeridiem}</span>
        </p>
        <p className="mt-1 text-xs font-semibold text-ink-faint">to {end}</p>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg leading-tight font-extrabold text-ink">
            {shift.title}
          </h3>
          {shift.category === "COACHING" ? <Badge tone="blue">Coaching</Badge> : null}
          {shift.slotId === null && shift.category !== "COACHING" ? (
            <Badge>Special time</Badge>
          ) : null}
        </div>
        {shift.location ? (
          <p className="mt-1 text-sm font-semibold text-ink-soft">{shift.location}</p>
        ) : null}
        {shift.description ? (
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-soft">
            {shift.description}
          </p>
        ) : null}
        {shift.owner ? (
          <p className="mt-2 text-xs text-ink-faint">Board lead · {shift.owner.name}</p>
        ) : null}
      </div>

      <div className="flex flex-col items-start gap-3 sm:items-end">
        <CapacityPill filled={shift.filled} capacity={shift.capacity} />
        <SignupControls
          shiftId={shift.id}
          shiftTitle={shift.title}
          my={shift.my}
          full={full}
          past={past}
        />
      </div>
    </article>
  );
}
