import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, PageHeader, Badge, ButtonLink } from "@/components/ui";
import { ShiftForm, type ShiftFormValues } from "@/components/client/ShiftForm";
import { RosterPanel, type RosterEntry } from "@/components/client/RosterPanel";
import { ShiftAdminButtons } from "@/components/client/ShiftAdminButtons";
import { getSlotOptions, getBoardOptions } from "@/lib/queries/admin";
import { fmtShiftWhen, toInputValue } from "@/lib/dates";

export const metadata = { title: "Shift · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminShiftPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ duplicated?: string }>;
}) {
  const [{ id }, { duplicated }] = await Promise.all([params, searchParams]);
  const shift = await prisma.shift.findUnique({
    where: { id },
    include: {
      signups: { include: { user: true }, orderBy: { createdAt: "asc" } },
      owner: { select: { name: true } },
    },
  });
  if (!shift) notFound();

  const [slots, boardMembers, allActive] = await Promise.all([
    getSlotOptions(),
    getBoardOptions(),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const active = shift.signups.filter((s) => s.status !== "CANCELLED");
  const entries: RosterEntry[] = active.map((s) => ({
    signupId: s.id,
    userId: s.userId,
    name: s.user.name,
    email: s.user.email,
    phone: s.user.phone,
    status: s.status as RosterEntry["status"],
  }));
  const onShiftIds = new Set(active.map((s) => s.userId));
  const candidates = allActive.filter((u) => !onShiftIds.has(u.id));
  const cancelled = shift.signups.filter((s) => s.status === "CANCELLED");

  const formValues: ShiftFormValues = {
    id: shift.id,
    title: shift.title,
    category: shift.category,
    slotId: shift.slotId,
    startsAt: toInputValue(shift.startsAt),
    endsAt: toInputValue(shift.endsAt),
    capacity: shift.capacity,
    location: shift.location ?? "",
    description: shift.description ?? "",
    ownerId: shift.ownerId ?? "",
    isPublished: shift.isPublished,
  };

  const rosterCount = entries.filter(
    (e) => e.status === "CONFIRMED" || e.status === "CHECKED_IN"
  ).length;

  return (
    <div>
      {duplicated ? (
        <div className="mb-4 rounded-xl bg-info-soft px-4 py-3 text-sm font-semibold text-info">
          This is a copy — adjust the time/date, then publish it (it starts hidden).
        </div>
      ) : null}
      <PageHeader
        title={shift.title}
        subtitle={
          <>
            {fmtShiftWhen(shift.startsAt, shift.endsAt)}
            {shift.owner ? ` · ${shift.owner.name}` : ""}{" "}
            {!shift.isPublished ? <Badge tone="amber">Hidden</Badge> : null}
          </>
        }
        action={
          <div className="flex items-center gap-2">
            <ButtonLink href="/admin/shifts" variant="ghost" size="sm">
              ← All shifts
            </ButtonLink>
            <ShiftAdminButtons shiftId={shift.id} rosterCount={rosterCount} />
          </div>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-extrabold text-ink">Shift details</h2>
          <ShiftForm shift={formValues} slots={slots} boardMembers={boardMembers} />
        </Card>

        <div className="space-y-6">
          <Card>
            <RosterPanel
              shiftId={shift.id}
              entries={entries}
              capacity={shift.capacity}
              candidates={candidates}
            />
          </Card>

          {cancelled.length > 0 ? (
            <Card>
              <h3 className="mb-2 text-sm font-extrabold text-ink">Cancellation history</h3>
              <div className="space-y-2">
                {cancelled.map((s) => (
                  <div key={s.id} className="border-b border-line pb-2 text-sm last:border-0">
                    <p className="font-semibold text-ink">
                      <Link href={`/admin/volunteers/${s.userId}`} className="hover:underline">
                        {s.user.name}
                      </Link>{" "}
                      <span className="text-xs font-medium text-ink-faint">
                        {s.cancelledBy === "ADMIN" ? "removed by you" : "cancelled themselves"}
                      </span>
                    </p>
                    {s.cancelNote ? (
                      <p className="mt-0.5 text-xs text-ink-soft italic">“{s.cancelNote}”</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
