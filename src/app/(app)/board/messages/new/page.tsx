import { requireBoard } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { now } from "@/lib/clock";
import { PageHeader, Card } from "@/components/primitives";
import { MessageComposer } from "@/components/client/MessageComposer";
import { fmtShiftWhen } from "@/lib/dates";

export const metadata = { title: "Email volunteers" };
export const dynamic = "force-dynamic";

export default async function BoardComposePage({
  searchParams,
}: {
  searchParams: Promise<{ shift?: string }>;
}) {
  const user = await requireBoard();
  const [{ shift }, currentTime] = await Promise.all([searchParams, now()]);
  const isManager = user.role === "MANAGER";

  const shifts = await prisma.shift.findMany({
    where: { endsAt: { gte: currentTime }, ...(isManager ? {} : { ownerId: user.id }) },
    orderBy: { startsAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Email your volunteers"
        subtitle="Goes out as a normal email — replies come back to your inbox."
      />
      <Card>
        <MessageComposer
          kinds={[
            { key: "OWNED_ALL", label: "All volunteers on my shifts" },
            { key: "SHIFT", label: "One shift's roster" },
          ]}
          shiftOptions={shifts.map((s) => ({
            id: s.id,
            label: `${s.title} — ${fmtShiftWhen(s.startsAt, s.endsAt)}`,
          }))}
          userOptions={null}
          initialShiftId={shift}
          doneHref="/board"
        />
      </Card>
    </div>
  );
}
