import { requireBoard } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { now } from "@/lib/clock";
import { Card, PageHeader, Badge, ButtonLink, EmptyState } from "@/components/primitives";
import { fmtShiftWhen } from "@/lib/dates";

export const metadata = { title: "My volunteers" };
export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const user = await requireBoard();
  const currentTime = await now();
  const isManager = user.role === "MANAGER";

  const shifts = await prisma.shift.findMany({
    where: {
      endsAt: { gte: currentTime },
      ...(isManager ? {} : { ownerId: user.id }),
    },
    include: {
      signups: {
        where: { status: { in: ["CONFIRMED", "CHECKED_IN", "WAITLISTED"] } },
        include: { user: { select: { name: true, email: true, phone: true } } },
      },
      owner: { select: { name: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  const rows = shifts.map((s) => {
    const confirmed = s.signups.filter(
      (x) => x.status === "CONFIRMED" || x.status === "CHECKED_IN"
    );
    return { ...s, confirmed, waitlisted: s.signups.filter((x) => x.status === "WAITLISTED") };
  });
  const understaffed = rows.filter((r) => r.confirmed.length < r.capacity).length;

  return (
    <div>
      <PageHeader
        title="My volunteers"
        subtitle={
          isManager
            ? "Staffing for every upcoming shift."
            : understaffed > 0
              ? `${understaffed} of your shifts still need${understaffed === 1 ? "s" : ""} volunteers.`
              : "All your shifts are fully staffed 🎉"
        }
        action={
          rows.length > 0 ? (
            <ButtonLink href="/board/messages/new" variant="secondary" size="sm">
              ✉ Email all my volunteers
            </ButtonLink>
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No upcoming shifts are assigned to you"
          hint="The volunteer manager assigns shifts to board members — ask them to put you in charge of yours."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((s) => {
            const n = s.confirmed.length;
            const tone = n >= s.capacity ? "green" : n === 0 ? "red" : "amber";
            return (
              <Card key={s.id} className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
                      {s.category === "COACHING" ? <Badge tone="blue">Coaching</Badge> : null}
                      {isManager && s.owner ? <Badge>{s.owner.name}</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{fmtShiftWhen(s.startsAt, s.endsAt)}</p>
                  </div>
                  <Badge tone={tone}>
                    {n}/{s.capacity} staffed
                  </Badge>
                </div>

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-bold text-ted select-none">
                    {n === 0 ? "No volunteers yet" : `See who's coming (${n})`}
                    {s.waitlisted.length > 0 ? ` · ${s.waitlisted.length} waitlisted` : ""}
                  </summary>
                  <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                    {s.confirmed.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Nobody has signed up yet — the manager can help you fill it.
                      </p>
                    ) : (
                      s.confirmed.map((x) => (
                        <p key={x.id} className="text-sm text-foreground">
                          <span className="font-semibold">{x.user.name}</span>{" "}
                          <span className="text-xs text-muted-foreground">
                            · {x.user.email}
                            {x.user.phone ? ` · ${x.user.phone}` : ""}
                          </span>
                        </p>
                      ))
                    )}
                    {s.confirmed.length > 0 ? (
                      <ButtonLink
                        href={`/board/messages/new?shift=${s.id}`}
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                      >
                        ✉ Email this shift&apos;s volunteers
                      </ButtonLink>
                    ) : null}
                  </div>
                </details>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
