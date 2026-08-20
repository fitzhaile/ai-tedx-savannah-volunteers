import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Download one signed-up shift as a calendar event. */
export async function GET(_req: Request, { params }: { params: Promise<{ signupId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { signupId } = await params;
  const signup = await prisma.signup.findUnique({
    where: { id: signupId },
    include: { shift: true },
  });
  if (!signup || signup.userId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const s = signup.shift;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TEDxSavannah Volunteers//EN",
    "BEGIN:VEVENT",
    `UID:${signup.id}@tedxsavannah-volunteers`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(s.startsAt)}`,
    `DTEND:${icsDate(s.endsAt)}`,
    `SUMMARY:${icsEscape(`TEDxSavannah: ${s.title}`)}`,
    s.location ? `LOCATION:${icsEscape(s.location)}` : "",
    s.description ? `DESCRIPTION:${icsEscape(s.description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="tedx-${s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics"`,
    },
  });
}
