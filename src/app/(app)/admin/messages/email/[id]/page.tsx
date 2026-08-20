import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { renderLogRow } from "@/lib/email/outbox";
import { PageHeader, Badge, ButtonLink } from "@/components/ui";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/dates";

export const metadata = { title: "Email · Admin" };
export const dynamic = "force-dynamic";

export default async function EmailViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.emailLog.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  });
  if (!row) notFound();

  // Rendered with a placeholder link so viewing never mints a live sign-in URL.
  const { subject, html } = await renderLogRow(row, { forDisplay: true });

  return (
    <div>
      <PageHeader
        title={subject}
        subtitle={
          <>
            to {row.user?.name ?? row.toEmail} ({row.toEmail}) ·{" "}
            {row.sentAt
              ? `sent ${formatInTimeZone(row.sentAt, TZ, "MMM d, h:mm a")}`
              : "not sent yet"}{" "}
            <Badge
              tone={row.status === "SENT" ? "green" : row.status === "FAILED" ? "red" : "amber"}
            >
              {row.status.toLowerCase()}
            </Badge>
            {row.lastError ? <span className="text-ted"> · {row.lastError}</span> : null}
          </>
        }
        action={<ButtonLink href="/admin/messages" variant="ghost" size="sm">← Outbox</ButtonLink>}
      />
      <iframe
        srcDoc={html}
        sandbox=""
        className="h-[70vh] w-full rounded-xl border border-line bg-white"
        title="Email preview"
      />
    </div>
  );
}
