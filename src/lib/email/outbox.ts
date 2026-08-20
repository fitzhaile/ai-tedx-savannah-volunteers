import "server-only";
import { Prisma, type EmailKind, type EmailLog } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/clock";
import { buildEmail, type EmailParams } from "@/lib/email/templates";
import { deliver } from "@/lib/email/send";
import { loginLink, appUrl } from "@/lib/tokens";
import { startOfEtDay } from "@/lib/dates";

/**
 * Single choke point for all outbound email.
 * - Transactional email: sendNow() — logged, sent immediately.
 * - Bulk email (broadcasts, reminders): enqueueEmail() then drainOutbox().
 * Budget counting uses REAL time (not simulated) because Gmail's daily cap
 * is a real-world constraint; dedupeKeys make reminder runs idempotent.
 */

const MAX_ATTEMPTS = 3;

export interface EnqueueArgs {
  kind: EmailKind;
  toEmail: string;
  userId?: string | null;
  /** Where the email's button lands the signed-in recipient (default /me). */
  linkPath?: string;
  params?: EmailParams;
  dedupeKey?: string;
  messageId?: string;
  scheduledFor?: Date;
}

/** Queue an email. Returns null when the dedupeKey already exists. */
export async function enqueueEmail(args: EnqueueArgs): Promise<EmailLog | null> {
  const params: EmailParams = { ...(args.params ?? {}), linkPath: args.linkPath ?? "/me" };
  const { subject } = buildEmail(args.kind, params, "#");
  try {
    return await prisma.emailLog.create({
      data: {
        kind: args.kind,
        toEmail: args.toEmail,
        userId: args.userId ?? null,
        subject,
        paramsJson: params as Prisma.InputJsonValue,
        dedupeKey: args.dedupeKey,
        messageId: args.messageId,
        scheduledFor: args.scheduledFor,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return null;
    throw e;
  }
}

/** Render a stored outbox row to {subject, html}, minting the sign-in link. */
export async function renderLogRow(
  row: Pick<EmailLog, "kind" | "userId" | "paramsJson">,
  opts: { forDisplay?: boolean } = {}
): Promise<{ subject: string; html: string }> {
  const params = (row.paramsJson ?? {}) as EmailParams;
  const linkPath = typeof params.linkPath === "string" ? params.linkPath : "/me";
  let url: string;
  if (opts.forDisplay || !row.userId) {
    url = appUrl(linkPath);
  } else {
    url = await loginLink(row.userId, linkPath, row.kind === "MAGIC_LINK" ? "15m" : "14d");
  }
  return buildEmail(row.kind, params, url);
}

async function attemptSend(row: EmailLog): Promise<EmailLog> {
  const settings = await getSettings();
  const { subject, html } = await renderLogRow(row);
  const result = await deliver({
    to: row.toEmail,
    subject,
    html,
    fromName: settings.fromName,
    replyTo: settings.replyToEmail,
  });
  if (result.ok) {
    return prisma.emailLog.update({
      where: { id: row.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        attempts: { increment: 1 },
        providerId: result.providerId,
        lastError: null,
      },
    });
  }
  const attempts = row.attempts + 1;
  return prisma.emailLog.update({
    where: { id: row.id },
    data: {
      status: attempts >= MAX_ATTEMPTS ? "FAILED" : "QUEUED",
      attempts,
      lastError: result.error,
    },
  });
}

/** Enqueue + send immediately (transactional email). Null when deduped. */
export async function sendNow(args: EnqueueArgs): Promise<EmailLog | null> {
  const row = await enqueueEmail(args);
  if (!row) return null;
  return attemptSend(row);
}

/** Emails SENT so far in the current REAL Savannah day. */
export async function sentTodayCount(): Promise<number> {
  return prisma.emailLog.count({
    where: { status: "SENT", sentAt: { gte: startOfEtDay(new Date()) } },
  });
}

export async function queueDepth(): Promise<number> {
  return prisma.emailLog.count({ where: { status: "QUEUED" } });
}

/** Send queued emails oldest-first, up to the remaining daily budget. */
export async function drainOutbox(): Promise<{ sent: number; failed: number; deferred: number }> {
  const settings = await getSettings();
  const already = await sentTodayCount();
  const remaining = Math.max(0, settings.dailyEmailBudget - already);
  const due = await prisma.emailLog.findMany({
    where: {
      status: "QUEUED",
      OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
    },
    orderBy: { createdAt: "asc" },
    take: remaining,
  });
  let sent = 0;
  let failed = 0;
  for (const row of due) {
    const updated = await attemptSend(row);
    if (updated.status === "SENT") sent += 1;
    else failed += 1;
  }
  const deferred = await queueDepth();
  return { sent, failed, deferred };
}
