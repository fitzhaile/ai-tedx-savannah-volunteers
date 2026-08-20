import "server-only";
import { addDays } from "date-fns";
import { prisma } from "@/lib/db";
import { now } from "@/lib/clock";
import { enqueueEmail, drainOutbox } from "@/lib/email/outbox";
import { syncGmailThreads, type SyncResult } from "@/lib/email/imap-sync";
import { dayKey, fmtDay, fmtShiftWhen } from "@/lib/dates";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Everything time-driven, in one idempotent pass:
 *  1. Queue shift reminders (3 days ahead, and day-of) — dedupe keys make it
 *     safe to run any number of times per day.
 *  2. Drain the email outbox within the daily budget.
 *  3. Pull replies from Gmail into conversation threads (gmail mode only;
 *     time-boxed so a hung IMAP session can never starve steps 1–2 on the
 *     next run).
 * Called by /api/cron/tick (external pinger + Vercel cron) and by the
 * "Run scheduler now" button on the time-travel panel.
 */
export async function runScheduledWork(): Promise<{
  remindersQueued: number;
  sent: number;
  failed: number;
  deferred: number;
  imap: SyncResult;
}> {
  const currentTime = await now();
  let remindersQueued = 0;

  const leads = [
    { lead: "t3" as const, target: addDays(currentTime, 3) },
    { lead: "today" as const, target: currentTime },
  ];

  for (const { lead, target } of leads) {
    const targetKey = dayKey(target);
    const signups = await prisma.signup.findMany({
      where: {
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
        user: { isActive: true },
        shift: { isPublished: true },
      },
      include: { shift: true, user: true },
    });
    const dueForDay = signups.filter(
      (s) => dayKey(s.shift.startsAt) === targetKey && s.shift.endsAt >= currentTime
    );

    // One email per volunteer per day, listing all their shifts that day.
    const byUser = new Map<string, typeof dueForDay>();
    for (const s of dueForDay) {
      if (!byUser.has(s.userId)) byUser.set(s.userId, []);
      byUser.get(s.userId)!.push(s);
    }

    for (const [userId, userSignups] of byUser) {
      const user = userSignups[0].user;
      const created = await enqueueEmail({
        kind: "REMINDER",
        toEmail: user.email,
        userId,
        linkPath: "/me",
        dedupeKey: `reminder:${lead}:${userId}:${targetKey}`,
        params: {
          name: user.name,
          lead,
          dayLabel: fmtDay(userSignups[0].shift.startsAt),
          shifts: userSignups
            .sort((a, b) => a.shift.startsAt.getTime() - b.shift.startsAt.getTime())
            .map((s) => ({
              title: s.shift.title,
              when: fmtShiftWhen(s.shift.startsAt, s.shift.endsAt),
              location: s.shift.location ?? "",
            })),
        },
      });
      if (created) remindersQueued += 1;
    }
  }

  const drained = await drainOutbox();

  let imap: SyncResult = { ran: false, reason: "not attempted" };
  try {
    imap = await withTimeout(syncGmailThreads(), 30_000);
  } catch (e) {
    console.error("[imap-sync]", e);
    imap = { ran: false, reason: e instanceof Error ? e.message : String(e) };
  }

  return { remindersQueued, ...drained, imap };
}
