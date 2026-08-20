"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { now } from "@/lib/clock";
import { transactionalSignup, type SignupResult } from "@/lib/signup-core";
import {
  notifySignupConfirmed,
  notifyCancelConfirmed,
  notifyCancelAlert,
  notifySpotOpened,
} from "@/lib/notify";

export type { SignupResult } from "@/lib/signup-core";

function revalidateShiftPages() {
  revalidatePath("/shifts");
  revalidatePath("/me");
  revalidatePath("/board");
  revalidatePath("/admin");
}

export async function signUpForShift(shiftId: string): Promise<SignupResult> {
  const user = await requireUser();
  const result = await transactionalSignup(shiftId, user.id, false, await now());
  if (result.ok && result.status === "confirmed") {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (shift) await notifySignupConfirmed(user, shift);
  }
  revalidateShiftPages();
  return result;
}

/** Join the waitlist of a full shift (or grab a spot if one opened meanwhile). */
export async function joinWaitlist(shiftId: string): Promise<SignupResult> {
  const user = await requireUser();
  const result = await transactionalSignup(shiftId, user.id, true, await now());
  if (result.ok && result.status === "confirmed") {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (shift) await notifySignupConfirmed(user, shift);
  }
  revalidateShiftPages();
  return result;
}

/** Waitlist claim after a SPOT_OPENED email. First claim wins. */
export async function claimSpot(shiftId: string): Promise<SignupResult> {
  const user = await requireUser();
  const existing = await prisma.signup.findUnique({
    where: { shiftId_userId: { shiftId, userId: user.id } },
  });
  if (!existing || existing.status !== "WAITLISTED") {
    return signUpForShift(shiftId);
  }
  const result = await transactionalSignup(shiftId, user.id, false, await now());
  if (result.ok && result.status === "confirmed") {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (shift) await notifySignupConfirmed(user, shift);
  }
  revalidateShiftPages();
  return result;
}

export type CancelResult = { ok: true } | { ok: false; error: string };

export async function cancelMySignup(signupId: string, note?: string): Promise<CancelResult> {
  const user = await requireUser();
  const signup = await prisma.signup.findUnique({
    where: { id: signupId },
    include: { shift: true },
  });
  if (!signup || signup.userId !== user.id) return { ok: false, error: "Signup not found" };
  if (signup.status === "CANCELLED") return { ok: true };

  const wasConfirmed = signup.status === "CONFIRMED" || signup.status === "CHECKED_IN";
  const filledBefore = await prisma.signup.count({
    where: { shiftId: signup.shiftId, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
  });
  const wasFull = filledBefore >= signup.shift.capacity;

  const trimmed = note?.trim() ? note.trim().slice(0, 500) : null;
  await prisma.signup.update({
    where: { id: signupId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: "SELF",
      cancelNote: trimmed,
      checkedInAt: null,
    },
  });

  await notifyCancelConfirmed(user, signup.shift);
  if (wasConfirmed) {
    await notifyCancelAlert(signup.shift, user, trimmed);
    if (wasFull) await notifySpotOpened(signup.shift);
  }
  revalidateShiftPages();
  return { ok: true };
}
