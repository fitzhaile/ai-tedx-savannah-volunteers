"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireManager, requireUser } from "@/lib/auth";
import { now } from "@/lib/clock";
import { notifyDirectMessage, notifyThreadReplyNotice } from "@/lib/notify";
import { syncGmailThreads } from "@/lib/email/imap-sync";
import type { FormState } from "@/lib/actions/admin-actions";

const bodySchema = z
  .string()
  .trim()
  .min(1, "Write a message first")
  .max(5000, "Keep it under 5,000 characters");

/** Manager writes to one member from their contact record. */
export async function sendThreadMessageAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const manager = await requireManager();
  const userId = String(formData.get("userId") ?? "");
  const parsed = bodySchema.safeParse(formData.get("body"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid message" };

  const member = await prisma.user.findUnique({ where: { id: userId } });
  if (!member || member.role === "MANAGER") return { error: "Person not found" };
  if (!member.isActive) return { error: `${member.name} is deactivated` };

  const row = await prisma.threadMessage.create({
    data: {
      userId: member.id,
      direction: "FROM_TEAM",
      source: "APP",
      authorId: manager.id,
      body: parsed.data,
      unreadForMember: true,
      createdAt: await now(),
    },
  });
  const log = await notifyDirectMessage(member, manager, parsed.data);
  if (log) {
    await prisma.threadMessage.update({
      where: { id: row.id },
      data: { emailLogId: log.id },
    });
  }
  revalidatePath(`/admin/volunteers/${member.id}`);
  return { ok: true };
}

/** A volunteer/board member writes in their own thread. */
export async function sendMemberThreadMessageAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  if (user.role === "MANAGER") {
    return { error: "Managers reply from the volunteer's contact page" };
  }
  const parsed = bodySchema.safeParse(formData.get("body"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid message" };

  await prisma.threadMessage.create({
    data: {
      userId: user.id,
      direction: "FROM_MEMBER",
      source: "APP",
      authorId: user.id,
      body: parsed.data,
      unreadForManager: true,
      createdAt: await now(),
    },
  });
  await notifyThreadReplyNotice(user, parsed.data);
  revalidatePath("/me/messages");
  return { ok: true };
}

export async function markThreadReadByManagerAction(userId: string): Promise<void> {
  await requireManager();
  await prisma.threadMessage.updateMany({
    where: { userId, unreadForManager: true },
    data: { unreadForManager: false },
  });
}

export async function markThreadReadByMemberAction(): Promise<void> {
  const user = await requireUser();
  await prisma.threadMessage.updateMany({
    where: { userId: user.id, unreadForMember: true },
    data: { unreadForMember: false },
  });
}

/** Manual "check for replies" — the cron does this automatically. */
export async function syncInboxNowAction(): Promise<{ ok: boolean; summary: string }> {
  await requireManager();
  const r = await syncGmailThreads({ force: true });
  revalidatePath("/admin", "layout");
  if (!r.ran) return { ok: false, summary: `Didn't sync: ${r.reason}.` };
  const errs = r.errors.length ? ` (${r.errors.length} error${r.errors.length === 1 ? "" : "s"})` : "";
  return {
    ok: r.errors.length === 0,
    summary: `Checked Gmail: ${r.ingested} new message${r.ingested === 1 ? "" : "s"}, ${r.skipped} skipped${errs}.`,
  };
}
