import type { Shift } from "@prisma/client";
import { Card, Badge } from "@/components/ui";
import { CapacityPill } from "@/components/CapacityPill";
import { SignupControls, type MySignupInfo } from "@/components/client/SignupControls";
import { fmtTimeRange } from "@/lib/dates";

export interface ShiftBoardItem extends Shift {
  owner: { name: string } | null;
  filled: number;
  my: MySignupInfo | null;
}

export function ShiftCard({ shift, past }: { shift: ShiftBoardItem; past: boolean }) {
  const full = shift.filled >= shift.capacity;
  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-ink">{shift.title}</h3>
          {shift.category === "COACHING" ? <Badge tone="blue">Coaching</Badge> : null}
          {shift.slotId === null && shift.category !== "COACHING" ? (
            <Badge tone="neutral">Special time</Badge>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm font-bold text-ted">
          {fmtTimeRange(shift.startsAt, shift.endsAt)}
        </p>
        {shift.location ? <p className="mt-0.5 text-sm text-ink-soft">{shift.location}</p> : null}
        {shift.description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{shift.description}</p>
        ) : null}
        {shift.owner ? (
          <p className="mt-1.5 text-xs text-ink-faint">Board lead: {shift.owner.name}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
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
