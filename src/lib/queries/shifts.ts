import "server-only";
import { prisma } from "@/lib/db";
import type { ShiftBoardItem } from "@/components/ShiftCard";
import type { MySignupInfo } from "@/components/client/SignupControls";

/** Upcoming published shifts with fill counts and the viewer's signup state. */
export async function getShiftBoard(userId: string, from: Date): Promise<ShiftBoardItem[]> {
  const shifts = await prisma.shift.findMany({
    where: { isPublished: true, endsAt: { gte: from } },
    include: {
      owner: { select: { name: true } },
      signups: { select: { id: true, userId: true, status: true } },
    },
    orderBy: { startsAt: "asc" },
  });
  return shifts.map((s) => {
    const filled = s.signups.filter(
      (x) => x.status === "CONFIRMED" || x.status === "CHECKED_IN"
    ).length;
    const mine = s.signups.find((x) => x.userId === userId);
    const my: MySignupInfo | null = mine ? { id: mine.id, status: mine.status } : null;
    const { signups: _signups, ...rest } = s;
    return { ...rest, filled, my };
  });
}
