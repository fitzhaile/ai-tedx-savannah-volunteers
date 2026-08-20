import { prisma } from "@/lib/db";

export type SignupResult =
  | { ok: true; status: "confirmed" | "waitlisted" }
  | { ok: false; reason: "full" | "past" | "unavailable" | "already" };

/**
 * Capacity-safe signup. The shift row is locked FOR UPDATE so two volunteers
 * racing for the last spot can't both get it. Kept free of auth/request
 * concerns so it can be unit-tested directly.
 */
export async function transactionalSignup(
  shiftId: string,
  userId: string,
  allowWaitlist: boolean,
  currentTime: Date
): Promise<SignupResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM shifts WHERE id = ${shiftId} FOR UPDATE`;
    const shift = await tx.shift.findUnique({ where: { id: shiftId } });
    if (!shift || !shift.isPublished) return { ok: false as const, reason: "unavailable" as const };
    if (shift.endsAt < currentTime) return { ok: false as const, reason: "past" as const };

    const existing = await tx.signup.findUnique({
      where: { shiftId_userId: { shiftId, userId } },
    });
    if (existing && (existing.status === "CONFIRMED" || existing.status === "CHECKED_IN")) {
      return { ok: false as const, reason: "already" as const };
    }

    const filled = await tx.signup.count({
      where: { shiftId, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
    });

    if (filled >= shift.capacity) {
      if (!allowWaitlist) return { ok: false as const, reason: "full" as const };
      await tx.signup.upsert({
        where: { shiftId_userId: { shiftId, userId } },
        update: { status: "WAITLISTED", cancelledAt: null, cancelledBy: null, cancelNote: null },
        create: { shiftId, userId, status: "WAITLISTED" },
      });
      return { ok: true as const, status: "waitlisted" as const };
    }

    await tx.signup.upsert({
      where: { shiftId_userId: { shiftId, userId } },
      update: {
        status: "CONFIRMED",
        cancelledAt: null,
        cancelledBy: null,
        cancelNote: null,
        checkedInAt: null,
      },
      create: { shiftId, userId, status: "CONFIRMED" },
    });
    return { ok: true as const, status: "confirmed" as const };
  });
}
