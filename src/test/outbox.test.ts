import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/db";
import { enqueueEmail, drainOutbox, sentTodayCount } from "@/lib/email/outbox";
import { runScheduledWork } from "@/lib/scheduler";

describe("outbox & scheduler", () => {
  let originalBudget = 400;
  let originalSimulatedNow: Date | null = null;

  beforeAll(async () => {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    originalBudget = settings?.dailyEmailBudget ?? 400;
    originalSimulatedNow = settings?.simulatedNow ?? null;
  });

  afterAll(async () => {
    await prisma.settings.update({
      where: { id: 1 },
      data: { dailyEmailBudget: originalBudget, simulatedNow: originalSimulatedNow },
    });
    await prisma.emailLog.deleteMany({ where: { toEmail: { endsWith: "@example.test" } } });
    await prisma.$disconnect();
  });

  it("reminders are queued once per volunteer per day (dedupe), even across runs", async () => {
    // Simulate May 12, 2027 — three days before event day, so T-3 reminders
    // for the seeded May 15 shifts are due.
    await prisma.settings.update({
      where: { id: 1 },
      data: { simulatedNow: fromZonedTime("2027-05-12T08:00:00", "America/New_York") },
    });
    await prisma.emailLog.deleteMany({ where: { kind: "REMINDER" } });

    const first = await runScheduledWork();
    expect(first.remindersQueued).toBeGreaterThan(0);

    const second = await runScheduledWork();
    expect(second.remindersQueued).toBe(0);

    await prisma.settings.update({ where: { id: 1 }, data: { simulatedNow: null } });
  });

  it("drainOutbox respects the daily budget and defers the rest", async () => {
    for (let i = 0; i < 3; i++) {
      await enqueueEmail({
        kind: "BROADCAST",
        toEmail: `budget-${i}@example.test`,
        params: { subject: "Budget test", body: "Hello", senderName: "Test" },
      });
    }
    const alreadySent = await sentTodayCount();
    await prisma.settings.update({
      where: { id: 1 },
      data: { dailyEmailBudget: alreadySent + 1 },
    });

    const result = await drainOutbox();
    expect(result.sent).toBe(1);
    expect(result.deferred).toBeGreaterThanOrEqual(2);

    // Raise the budget back — the deferred two now go out.
    await prisma.settings.update({
      where: { id: 1 },
      data: { dailyEmailBudget: originalBudget },
    });
    const second = await drainOutbox();
    expect(second.sent).toBeGreaterThanOrEqual(2);
  });
});
