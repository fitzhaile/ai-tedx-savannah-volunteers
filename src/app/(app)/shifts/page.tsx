import { requireUser } from "@/lib/auth";
import { now } from "@/lib/clock";
import { getShiftBoard } from "@/lib/queries/shifts";
import { ShiftCard } from "@/components/ShiftCard";
import { ClaimCard } from "@/components/client/ClaimCard";
import { PageHeader, EmptyState, Badge } from "@/components/primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PartyPopper } from "lucide-react";
import { dayKey, fmtDay, fmtShiftWhen, TZ } from "@/lib/dates";
import { formatInTimeZone } from "date-fns-tz";

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

  const openSpots = (list: { capacity: number; filled: number }[]) =>
    list.reduce((n, s) => n + Math.max(0, s.capacity - s.filled), 0);
  const dayKeys = [...dayGroups.keys()];
  const defaultTab = dayKeys[0] ?? (coaching.length ? "coaching" : "");

  return (
    <div>
      {welcome ? (
        <Alert className="mb-5 border-go/30 bg-go-soft">
          <PartyPopper className="text-go" />
          <AlertTitle>You&apos;re in.</AlertTitle>
          <AlertDescription>
            Grab any shifts below — you&apos;ll get a confirmation email for each one.
          </AlertDescription>
        </Alert>
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
        subtitle={`First come, first served — ${openSpots(board)} spot${openSpots(board) === 1 ? "" : "s"} still open across ${board.length} shift${board.length === 1 ? "" : "s"}.`}
      />

      {board.length === 0 ? (
        <EmptyState
          title="No open shifts right now"
          hint="New shifts appear here as the event approaches — watch your email."
        />
      ) : (
        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-5 flex h-auto w-full flex-nowrap justify-start overflow-x-auto">
            {dayKeys.map((k) => {
              const d = dayGroups.get(k)![0].startsAt;
              return (
                <TabsTrigger key={k} value={k} className="px-3 py-2">
                  <span className="font-display text-base font-bold">
                    {formatInTimeZone(d, TZ, "d")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatInTimeZone(d, TZ, "EEE")}
                  </span>
                  <span className="ml-1 rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
                    {openSpots(dayGroups.get(k)!)} open
                  </span>
                </TabsTrigger>
              );
            })}
            {coaching.length > 0 ? (
              <TabsTrigger value="coaching" className="px-3 py-2">
                <span className="font-semibold">Speaker coaching</span>
                <span className="ml-1 rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
                  {openSpots(coaching)} open
                </span>
              </TabsTrigger>
            ) : null}
          </TabsList>

          {dayKeys.map((k) => {
            const shifts = dayGroups.get(k)!;
            return (
              <TabsContent key={k} value={k}>
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="font-display text-xl font-bold">{fmtDay(shifts[0].startsAt)}</h2>
                  {k === EVENT_DAY ? <Badge tone="red">Event day</Badge> : null}
                </div>
                <div className="space-y-3">
                  {shifts.map((s) => (
                    <ShiftCard key={s.id} shift={s} past={s.endsAt < currentTime} />
                  ))}
                </div>
              </TabsContent>
            );
          })}

          {coaching.length > 0 ? (
            <TabsContent value="coaching">
              <div className="mb-4">
                <h2 className="font-display text-xl font-bold">Speaker coaching</h2>
                <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                  Evening sessions helping our speakers rehearse in the months before the
                  event. Low-key, fascinating, and a great way to meet the speakers early.
                </p>
              </div>
              <div className="space-y-6">
                {[...coachingGroups.entries()].map(([k, shifts]) => (
                  <div key={k}>
                    <h3 className="mb-2 text-sm font-bold text-muted-foreground">
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
            </TabsContent>
          ) : null}
        </Tabs>
      )}
    </div>
  );
}
