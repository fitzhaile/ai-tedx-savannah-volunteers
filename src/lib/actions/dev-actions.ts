"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { fromInputValue } from "@/lib/dates";
import { runScheduledWork } from "@/lib/scheduler";

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
