import type { Shift } from "@prisma/client";
import { MapPin } from "lucide-react";
import { Card, Badge } from "@/components/primitives";
import { CapacityPill } from "@/components/CapacityPill";
import { SignupControls, type MySignupInfo } from "@/components/client/SignupControls";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/dates";

export interface ShiftBoardItem extends Shift {
  owner: { name: string } | null;
  filled: number;
  my: MySignupInfo | null;
}

export function ShiftCard({ shift, past }: { shift: ShiftBoardItem; past: boolean }) {
  const full = shift.filled >= shift.capacity;
  const mine = shift.my && shift.my.status !== "CANCELLED" && shift.my.status !== "NO_SHOW";
  return (
    <Card
      className={
        "grid gap-4 sm:grid-cols-[6rem_1fr_auto] sm:gap-6 " +
        (mine ? "border-ted/40 bg-ted-soft/30" : "")
      }
    >
      <div>
        <p className="font-display text-xl leading-none font-bold text-foreground">
          {formatInTimeZone(shift.startsAt, TZ, "h:mm")}
          <span className="ml-1 text-xs font-semibold text-muted-foreground">
            {formatInTimeZone(shift.startsAt, TZ, "a")}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          to {formatInTimeZone(shift.endsAt, TZ, "h:mm a")}
        </p>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base leading-tight font-bold text-foreground">{shift.title}</h3>
          {shift.category === "COACHING" ? <Badge tone="blue">Coaching</Badge> : null}
          {shift.slotId === null && shift.category !== "COACHING" ? <Badge>Special time</Badge> : null}
        </div>
        {shift.location ? (
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {shift.location}
          </p>
        ) : null}
        {shift.description ? (
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {shift.description}
          </p>
        ) : null}
        {shift.owner ? (
          <p className="mt-2 text-xs text-muted-foreground">Board lead · {shift.owner.name}</p>
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
    </Card>
  );
}
