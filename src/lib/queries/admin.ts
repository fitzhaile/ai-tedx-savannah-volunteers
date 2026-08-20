import "server-only";
import { prisma } from "@/lib/db";
import { fmtShiftWhen } from "@/lib/dates";
import type { SlotOption } from "@/components/client/ShiftForm";

export async function getSlotOptions(): Promise<SlotOption[]> {
  const slots = await prisma.standardSlot.findMany({ orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }] });
  return slots.map((s) => ({ id: s.id, label: s.label, when: fmtShiftWhen(s.startsAt, s.endsAt) }));
}

export async function getBoardOptions(): Promise<{ id: string; name: string }[]> {
  return prisma.user.findMany({
    where: { role: "BOARD", isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
