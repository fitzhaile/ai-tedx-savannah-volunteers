import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSettings, now } from "@/lib/clock";
import { PageHeader } from "@/components/ui";
import { TimeTravelPanel } from "@/components/client/TimeTravelPanel";
import { fmtDateShort, fmtTime, toInputValue } from "@/lib/dates";

export const metadata = { title: "Time travel · Admin" };
export const dynamic = "force-dynamic";

export default async function DevPage() {
  if (process.env.ENABLE_TIME_TRAVEL !== "true") notFound();
  const [settings, currentTime, members] = await Promise.all([
    getSettings(),
    now(),
    prisma.user.findMany({
      where: { role: { not: "MANAGER" }, isActive: true },
      select: { name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="⏱ Time travel"
        subtitle={
          settings.simulatedNow
            ? `Simulated: it's ${fmtDateShort(currentTime)} at ${fmtTime(currentTime)}`
            : `Real time: ${fmtDateShort(currentTime)} at ${fmtTime(currentTime)}`
        }
      />
      <TimeTravelPanel
        simulatedNow={settings.simulatedNow ? toInputValue(settings.simulatedNow) : null}
        members={members}
      />
    </div>
  );
}
