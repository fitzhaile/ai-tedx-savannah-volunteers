import { requireUser } from "@/lib/auth";
import { now } from "@/lib/clock";
import { prisma } from "@/lib/db";
import { Card, PageHeader, EmptyState, Badge, ButtonLink } from "@/components/primitives";
import { SignupControls } from "@/components/client/SignupControls";
import { ProfileForm } from "@/components/client/ProfileForm";
import { fmtShiftWhen } from "@/lib/dates";

export const metadata = { title: "My shifts" };
export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await requireUser();
  const currentTime = await now();
  const signups = await prisma.signup.findMany({
    where: { userId: user.id, status: { not: "CANCELLED" } },
    include: { shift: true },
    orderBy: { shift: { startsAt: "asc" } },
  });
  const upcoming = signups.filter((s) => s.shift.endsAt >= currentTime);
  const past = signups.filter((s) => s.shift.endsAt < currentTime);

  return (
    <div>
      <PageHeader
        title="My shifts"
        subtitle="Everything you've signed up for. Plans change? Cancel early so we can fill the spot."
        action={<ButtonLink href="/shifts" variant="secondary" size="sm">Browse open shifts</ButtonLink>}
      />

      {upcoming.length === 0 ? (
        <EmptyState
          title="You're not signed up for any upcoming shifts"
          hint="Head to Shifts to see what's open."
        />
      ) : (
        <div className="space-y-3">
          {upcoming.map((s) => (
            <Card
              key={s.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-foreground">{s.shift.title}</h3>
                  {s.shift.category === "COACHING" ? <Badge tone="blue">Coaching</Badge> : null}
                  {s.status === "WAITLISTED" ? <Badge tone="amber">Waitlist</Badge> : null}
                </div>
                <p className="mt-0.5 text-sm font-bold text-ted">
                  {fmtShiftWhen(s.shift.startsAt, s.shift.endsAt)}
                </p>
                {s.shift.location ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">{s.shift.location}</p>
                ) : null}
                <a
                  href={`/api/ics/${s.id}`}
                  className="mt-1 inline-block text-xs font-semibold text-primary hover:underline"
                >
                  + Add to calendar
                </a>
              </div>
              <SignupControls
                shiftId={s.shiftId}
                shiftTitle={s.shift.title}
                my={{ id: s.id, status: s.status }}
                full={false}
                past={false}
              />
            </Card>
          ))}
        </div>
      )}

      {past.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold text-foreground">Past shifts</h2>
          <div className="space-y-2">
            {past.map((s) => (
              <Card key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-bold text-foreground">{s.shift.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtShiftWhen(s.shift.startsAt, s.shift.endsAt)}
                  </p>
                </div>
                {s.status === "CHECKED_IN" ? (
                  <Badge tone="green">Checked in ✓</Badge>
                ) : s.status === "NO_SHOW" ? (
                  <Badge tone="red">No-show</Badge>
                ) : (
                  <Badge>Signed up</Badge>
                )}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10 max-w-md">
        <h2 className="mb-3 text-lg font-bold text-foreground">My info</h2>
        <Card>
          <ProfileForm name={user.name} phone={user.phone} email={user.email} />
        </Card>
      </section>
    </div>
  );
}
