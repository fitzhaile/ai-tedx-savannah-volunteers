import { NextResponse } from "next/server";
import { runScheduledWork } from "@/lib/scheduler";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The scheduler heartbeat. Hit it every ~10 minutes with any free pinger
 * (cron-job.org, UptimeRobot) plus Vercel's daily cron as a backstop.
 * Auth: "Authorization: Bearer <CRON_SECRET>" header, or ?secret= for
 * pingers that can't set headers.
 */
async function handle(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runScheduledWork();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
