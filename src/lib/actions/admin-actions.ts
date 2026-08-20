"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireManager, normalizeEmail } from "@/lib/auth";
import { fromInputValue } from "@/lib/dates";
import { loginLink } from "@/lib/tokens";
import {
  notifySignupConfirmed,
  notifyRemoved,
  notifySpotOpened,
  notifyBoardInvite,
} from "@/lib/notify";

export interface FormState {
  error?: string;
  ok?: boolean;
}

function revalidateAll() {
  revalidatePath("/shifts");
  revalidatePath("/me");
  revalidatePath("/board");
  revalidatePath("/admin", "layout");
}

// ---------------------------------------------------------------------------
// Shifts
// ---------------------------------------------------------------------------

const shiftSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().trim().min(2, "Give the shift a title").max(120),
    category: z.enum(["EVENT", "COACHING", "GENERAL"]),
    timeMode: z.enum(["slot", "custom"]),
    slotId: z.string().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(200),
    location: z.string().trim().max(160).optional(),
    description: z.string().trim().max(1000).optional(),
    ownerId: z.string().optional(),
    isPublished: z.coerce.boolean(),
  })
  .refine((d) => d.timeMode !== "slot" || !!d.slotId, {
    message: "Pick a standard time slot",
  })
  .refine((d) => d.timeMode !== "custom" || (!!d.startsAt && !!d.endsAt), {
    message: "Enter start and end times",
  });

export async function saveShiftAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireManager();
  const parsed = shiftSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    category: formData.get("category"),
    timeMode: formData.get("timeMode"),
    slotId: formData.get("slotId") || undefined,
    startsAt: formData.get("startsAt") || undefined,
    endsAt: formData.get("endsAt") || undefined,
    capacity: formData.get("capacity"),
    location: formData.get("location") || undefined,
    description: formData.get("description") || undefined,
    ownerId: formData.get("ownerId") || undefined,
    isPublished: formData.get("isPublished") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const d = parsed.data;

  let startsAt: Date;
  let endsAt: Date;
  let slotId: string | null = null;
  if (d.timeMode === "slot") {
    const slot = await prisma.standardSlot.findUnique({ where: { id: d.slotId! } });
    if (!slot) return { error: "That time slot no longer exists" };
    startsAt = slot.startsAt;
    endsAt = slot.endsAt;
    slotId = slot.id;
  } else {
    startsAt = fromInputValue(d.startsAt!);
    endsAt = fromInputValue(d.endsAt!);
    if (endsAt <= startsAt) return { error: "The end time must be after the start time" };
  }

  const data = {
    title: d.title,
    category: d.category,
    slotId,
    startsAt,
    endsAt,
    capacity: d.capacity,
    location: d.location ?? null,
    description: d.description ?? null,
    ownerId: d.ownerId || null,
    isPublished: d.isPublished,
  };

  if (d.id) {
    await prisma.shift.update({ where: { id: d.id }, data });
  } else {
    await prisma.shift.create({ data: { ...data, createdById: user.id } });
  }
  revalidateAll();
  redirect("/admin/shifts");
}

export async function duplicateShiftAction(shiftId: string): Promise<void> {
  const user = await requireManager();
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) return;
  const copy = await prisma.shift.create({
    data: {
      title: shift.title,
      category: shift.category,
      slotId: shift.slotId,
      startsAt: shift.startsAt,
      endsAt: shift.endsAt,
      capacity: shift.capacity,
      location: shift.location,
      description: shift.description,
      ownerId: shift.ownerId,
      isPublished: false,
      createdById: user.id,
    },
  });
  revalidateAll();
  redirect(`/admin/shifts/${copy.id}?duplicated=1`);
}

export async function deleteShiftAction(shiftId: string): Promise<void> {
  await requireManager();
  await prisma.shift.delete({ where: { id: shiftId } });
  revalidateAll();
  redirect("/admin/shifts");
}

// ---------------------------------------------------------------------------
// Roster management
// ---------------------------------------------------------------------------

/** Manager adds a volunteer directly (may intentionally exceed capacity). */
export async function adminAddToShift(shiftId: string, userId: string): Promise<FormState> {
  await requireManager();
  const [shift, volunteer] = await Promise.all([
    prisma.shift.findUnique({ where: { id: shiftId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  if (!shift || !volunteer) return { error: "Not found" };
  await prisma.signup.upsert({
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
  await notifySignupConfirmed(volunteer, shift);
  revalidateAll();
  return { ok: true };
}

export async function adminRemoveFromShift(
  signupId: string,
  note: string,
  notify: boolean
): Promise<FormState> {
  await requireManager();
  const signup = await prisma.signup.findUnique({
    where: { id: signupId },
    include: { shift: true, user: true },
  });
  if (!signup) return { error: "Not found" };

  const wasConfirmed = signup.status === "CONFIRMED" || signup.status === "CHECKED_IN";
  const filledBefore = await prisma.signup.count({
    where: { shiftId: signup.shiftId, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
  });
  const trimmed = note.trim() ? note.trim().slice(0, 500) : null;

  await prisma.signup.update({
    where: { id: signupId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: "ADMIN",
      cancelNote: trimmed,
      checkedInAt: null,
    },
  });

  if (notify) await notifyRemoved(signup.user, signup.shift, trimmed);
  if (wasConfirmed && filledBefore >= signup.shift.capacity) {
    await notifySpotOpened(signup.shift);
  }
  revalidateAll();
  return { ok: true };
}

export async function adminSetSignupStatus(
  signupId: string,
  status: "CONFIRMED" | "NO_SHOW" | "CHECKED_IN"
): Promise<FormState> {
  await requireManager();
  await prisma.signup.update({
    where: { id: signupId },
    data: {
      status,
      checkedInAt: status === "CHECKED_IN" ? new Date() : null,
    },
  });
  revalidateAll();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Standard slots
// ---------------------------------------------------------------------------

const slotSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(2, "Give the slot a label").max(80),
  startsAt: z.string().min(1, "Start time required"),
  endsAt: z.string().min(1, "End time required"),
});

export async function saveSlotAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireManager();
  const parsed = slotSchema.safeParse({
    id: formData.get("id") || undefined,
    label: formData.get("label"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const startsAt = fromInputValue(parsed.data.startsAt);
  const endsAt = fromInputValue(parsed.data.endsAt);
  if (endsAt <= startsAt) return { error: "The end time must be after the start time" };

  if (parsed.data.id) {
    await prisma.standardSlot.update({
      where: { id: parsed.data.id },
      data: { label: parsed.data.label, startsAt, endsAt },
    });
  } else {
    const count = await prisma.standardSlot.count();
    await prisma.standardSlot.create({
      data: { label: parsed.data.label, startsAt, endsAt, sortOrder: count },
    });
  }
  revalidatePath("/admin/slots");
  return { ok: true };
}

export async function deleteSlotAction(slotId: string): Promise<void> {
  await requireManager();
  await prisma.standardSlot.delete({ where: { id: slotId } });
  revalidatePath("/admin/slots");
}

// ---------------------------------------------------------------------------
// Volunteers
// ---------------------------------------------------------------------------

export async function setUserActive(userId: string, isActive: boolean): Promise<FormState> {
  const manager = await requireManager();
  if (userId === manager.id) return { error: "You can't deactivate yourself" };
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  if (!isActive) {
    await prisma.session.deleteMany({ where: { userId } });
  }
  revalidateAll();
  return { ok: true };
}

const volunteerSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email("Enter a valid email").max(120),
  phone: z.string().trim().max(30).optional(),
  adminNotes: z.string().trim().max(2000).optional(),
});

export async function updateVolunteerAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireManager();
  const parsed = volunteerSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    adminNotes: formData.get("adminNotes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const email = normalizeEmail(parsed.data.email);
  const clash = await prisma.user.findFirst({
    where: { email, id: { not: parsed.data.id } },
  });
  if (clash) return { error: "Another account already uses that email" };
  await prisma.user.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      email,
      phone: parsed.data.phone ?? null,
      adminNotes: parsed.data.adminNotes ?? null,
    },
  });
  revalidateAll();
  return { ok: true };
}

/** Mint a 14-day sign-in link for a volunteer (support + testing tool). */
export async function generateSigninLink(userId: string): Promise<string> {
  await requireManager();
  return loginLink(userId, "/shifts");
}

// ---------------------------------------------------------------------------
// Board members
// ---------------------------------------------------------------------------

const boardSchema = z.object({
  name: z.string().trim().min(2, "Enter their name").max(80),
  email: z.string().trim().email("Enter a valid email").max(120),
});

export async function addBoardMemberAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const manager = await requireManager();
  const parsed = boardSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const email = normalizeEmail(parsed.data.email);

  const existing = await prisma.user.findUnique({ where: { email } });
  let member;
  if (existing) {
    if (existing.role === "MANAGER") return { error: "That's the manager account" };
    member = await prisma.user.update({
      where: { id: existing.id },
      data: { role: "BOARD", isActive: true },
    });
  } else {
    member = await prisma.user.create({
      data: { name: parsed.data.name, email, role: "BOARD" },
    });
  }
  await notifyBoardInvite(member, manager);
  revalidateAll();
  return { ok: true };
}

export async function removeBoardRole(userId: string): Promise<FormState> {
  await requireManager();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "BOARD") return { error: "Not a board member" };
  await prisma.user.update({ where: { id: userId }, data: { role: "VOLUNTEER" } });
  revalidateAll();
  return { ok: true };
}

export async function resendBoardInvite(userId: string): Promise<FormState> {
  const manager = await requireManager();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Not found" };
  await notifyBoardInvite(user, manager);
  return { ok: true };
}
