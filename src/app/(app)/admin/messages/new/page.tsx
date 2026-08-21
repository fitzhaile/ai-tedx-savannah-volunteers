import { prisma } from "@/lib/db";
import { now } from "@/lib/clock";
import { PageHeader, Card } from "@/components/primitives";
import { MessageComposer } from "@/components/client/MessageComposer";
import { fmtShiftWhen } from "@/lib/dates";

export const metadata = { title: "New message · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminComposePage({
  searchParams,
}: {
  searchParams: Promise<{ shift?: string; user?: string }>;
}) {
  const [{ shift, user }, currentTime] = await Promise.all([searchParams, now()]);
  const [shifts, users] = await Promise.all([
    prisma.shift.findMany({
      where: { endsAt: { gte: currentTime } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="New message"
        subtitle="Pick an audience, write it like a normal email, hit send."
      />
      <Card>
        <MessageComposer
          kinds={[
            { key: "ALL_ACTIVE", label: "Everyone" },
            { key: "CATEGORY", label: "Coaching volunteers" },
            { key: "SHIFT", label: "One shift's roster" },
            { key: "USERS", label: "Specific people" },
          ]}
          shiftOptions={shifts.map((s) => ({
            id: s.id,
            label: `${s.title} — ${fmtShiftWhen(s.startsAt, s.endsAt)}`,
          }))}
          userOptions={users}
          initialShiftId={shift}
          initialUserIds={user ? [user] : undefined}
          doneHref="/admin/messages"
        />
      </Card>
    </div>
  );
}
