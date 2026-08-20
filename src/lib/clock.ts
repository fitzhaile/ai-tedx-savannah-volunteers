import { cache } from "react";
import { prisma } from "@/lib/db";

/**
 * All "current time" reads in the app go through now() so the admin
 * time-travel panel (settings.simulatedNow) can simulate any point in the
 * season. Do not use `new Date()` for the current time anywhere else.
 */

export const getSettings = cache(async () => {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (settings) return settings;
  return prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, replyToEmail: process.env.MANAGER_EMAIL?.trim().toLowerCase() ?? null },
  });
});

export const now = cache(async (): Promise<Date> => {
  const settings = await getSettings();
  return settings.simulatedNow ?? new Date();
});

export const isTimeTravelling = cache(async (): Promise<boolean> => {
  const settings = await getSettings();
  return settings.simulatedNow != null;
});
