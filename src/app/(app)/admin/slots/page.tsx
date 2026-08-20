import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { SlotEditor, type SlotRowData } from "@/components/client/SlotEditor";
import { fmtShiftWhen, toInputValue } from "@/lib/dates";

export const metadata = { title: "Standard times · Admin" };
export const dynamic = "force-dynamic";

export default async function SlotsPage() {
  const slots = await prisma.standardSlot.findMany({
    include: { _count: { select: { shifts: true } } },
    orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }],
  });
  const rows: SlotRowData[] = slots.map((s) => ({
    id: s.id,
    label: s.label,
    startsAt: toInputValue(s.startsAt),
    endsAt: toInputValue(s.endsAt),
    when: fmtShiftWhen(s.startsAt, s.endsAt),
    shiftCount: s._count.shifts,
  }));

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Standard shift times"
        subtitle="Board members' volunteer needs fit into these slots — it keeps the schedule sane. Custom-time shifts stay possible for special occasions."
      />
      <SlotEditor slots={rows} />
    </div>
  );
}
