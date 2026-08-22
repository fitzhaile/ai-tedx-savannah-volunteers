"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { now } from "@/lib/clock";
import { fromInputValue } from "@/lib/dates";
import { runScheduledWork } from "@/lib/scheduler";
import { ingestInboundEmail } from "@/lib/email/imap-sync";
import { sendNow } from "@/lib/email/outbox";
import { SAMPLE_EMAILS } from "@/lib/email/samples";

/** Time-travel test tools. All gated behind ENABLE_TIME_TRAVEL=true. */

function assertEnabled() {
  if (process.env.ENABLE_TIME_TRAVEL !== "true") {
    throw new Error("Time travel is disabled (set ENABLE_TIME_TRAVEL=true)");
  }
}

/** value: datetime-local string (Savannah time) or null to return to real time. */
export async function setSimulatedNowAction(value: string | null): Promise<void> {
  await requireManager();
  assertEnabled();
  const simulatedNow = value ? fromInputValue(value) : null;
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { simulatedNow },
    create: { id: 1, simulatedNow },
  });
  revalidatePath("/", "layout");
}

export async function runSchedulerAction(): Promise<{
  remindersQueued: number;
  sent: number;
  failed: number;
  deferred: number;
  imap: { ran: boolean; ingested?: number };
}> {
  await requireManager();
  assertEnabled();
  const result = await runScheduledWork();
  revalidatePath("/", "layout");
  return result;
}

/** Forget past reminder sends so jumping back in time re-fires them. */
export async function clearReminderHistoryAction(): Promise<number> {
  await requireManager();
  assertEnabled();
  const { count } = await prisma.emailLog.deleteMany({ where: { kind: "REMINDER" } });
  revalidatePath("/", "layout");
  return count;
}

/** Replace everything (except the manager) with the fresh demo season. */
export async function loadDemoSeasonAction(): Promise<string> {
  const manager = await requireManager();
  assertEnabled();
  const { wipeAllButManager, seedDemoSeason } = await import("@/lib/demo-data");
  await wipeAllButManager(prisma, manager.email);
  const counts = await seedDemoSeason(prisma, manager.email);
  revalidatePath("/", "layout");
  return `Demo season loaded: ${counts.users} people, ${counts.shifts} shifts, ${counts.signups} signups.`;
}

/**
 * Feed a pretend email through the real ingestion path (the same code the
 * IMAP sync uses), so conversation threads can be tested without Gmail.
 */
export async function simulateInboundEmailAction(input: {
  fromEmail: string;
  body: string;
  subject?: string;
  mailbox?: "inbox" | "sent";
  toEmail?: string;
  replyToLatest?: boolean;
}): Promise<{ ok: boolean; detail: string }> {
  await requireManager();
  assertEnabled();

  const fromEmail = input.fromEmail.trim().toLowerCase();
  let inReplyTo: string | null = null;
  if (input.replyToLatest) {
    // Wire the simulated reply to a member's latest sent email, so the
    // references-based correlation path gets exercised end to end.
    const targetEmail = input.toEmail?.trim().toLowerCase() || fromEmail;
    const target = await prisma.user.findFirst({ where: { email: targetEmail } });
    if (!target) {
      return {
        ok: false,
        detail: `No member found with email ${targetEmail} to reply on behalf of.`,
      };
    }
    const latest = await prisma.emailLog.findFirst({
      where: { status: "SENT", providerId: { not: null }, userId: target.id },
      orderBy: { sentAt: "desc" },
    });
    if (!latest) {
      return {
        ok: false,
        detail: `The app hasn't sent ${target.name} any email yet — send them a message first.`,
      };
    }
    inReplyTo = latest.providerId;
  }

  const outcome = await ingestInboundEmail(
    {
      mailbox: input.mailbox ?? "inbox",
      messageId: `<sim-${randomUUID()}@simulated.local>`,
      inReplyTo,
      references: [],
      from: fromEmail,
      to: input.toEmail ? [input.toEmail.trim().toLowerCase()] : [],
      subject: input.subject?.trim() || "Simulated email",
      text: input.body,
      html: null,
      date: null,
      hasAppHeader: false,
    },
    { at: await now() }
  );

  revalidatePath("/", "layout");
  if (outcome.ok) {
    const user = await prisma.user.findUnique({ where: { id: outcome.userId } });
    return { ok: true, detail: `Ingested into ${user?.name ?? "?"}'s conversation.` };
  }
  const reasons: Record<string, string> = {
    self: "Skipped: that address belongs to you (the manager).",
    "unknown-sender": inReplyTo
      ? "Skipped: sender unknown and the reference didn't match."
      : "Skipped: no volunteer or board member has that email (try 'reply to their latest email' to test reply matching).",
    duplicate: "Skipped: an email with this ID was already ingested.",
    "app-sent": "Skipped: that looks like an email the app itself sent.",
    "no-member-recipient": "Skipped: no volunteer/board member among the recipients.",
  };
  return { ok: false, detail: reasons[outcome.skipped] ?? `Skipped: ${outcome.skipped}` };
}

/** The clean-slate reset before real volunteers start. Keeps only the manager. */
export async function resetForProductionAction(): Promise<string> {
  const manager = await requireManager();
  assertEnabled();
  const { wipeAllButManager } = await import("@/lib/demo-data");
  await wipeAllButManager(prisma, manager.email);
  await prisma.settings.update({ where: { id: 1 }, data: { simulatedNow: null } });
  revalidatePath("/", "layout");
  return "All demo data removed. Only your manager account remains — ready for real volunteers.";
}

/** Send the manager one real example of every email template (or just some kinds). */
export async function sendSampleEmailsAction(kinds?: string[]): Promise<string> {
  const manager = await requireManager();
  assertEnabled();
  const wanted = kinds?.length ? SAMPLE_EMAILS.filter((s) => kinds.includes(s.kind)) : SAMPLE_EMAILS;
  if (wanted.length === 0) return "No matching email kind.";
  // Send in parallel so the whole batch fits comfortably inside the
  // serverless time limit (Gmail SMTP is ~1–2s per message).
  const results = await Promise.all(
    wanted.map((sample) =>
      sendNow({
        kind: sample.kind,
        toEmail: manager.email,
        userId: manager.id,
        linkPath: sample.linkPath,
        params: sample.params,
      })
    )
  );
  const sent = results.filter((log) => log?.status === "SENT").length;
  const failed = results.length - sent;
  revalidatePath("/admin/messages");
  const where = (process.env.EMAIL_TRANSPORT ?? "console") === "gmail" ? manager.email : "the outbox only (console mode)";
  return `Sent ${sent} of ${wanted.length} sample email${wanted.length === 1 ? "" : "s"} to ${where}${failed ? ` — ${failed} failed; see Admin → Messages` : ""}.`;
}
