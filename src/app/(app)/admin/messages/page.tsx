import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/clock";
import { sentTodayCount, queueDepth } from "@/lib/email/outbox";
import { Card, PageHeader, Badge, ButtonLink, EmptyState } from "@/components/ui";
import { SyncNowButton } from "@/components/client/SyncNowButton";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/dates";

export const metadata = { title: "Messages · Admin" };
export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  MAGIC_LINK: "Sign-in link",
  WELCOME: "Welcome",
  BOARD_INVITE: "Board invite",
  SIGNUP_CONFIRM: "Signup confirmation",
  CANCEL_CONFIRM: "Cancel confirmation",
  CANCEL_ALERT: "Cancel alert",
  REMOVED_NOTICE: "Removed notice",
  REMINDER: "Reminder",
  BROADCAST: "Broadcast",
  SPOT_OPENED: "Spot opened",
  DIRECT_MESSAGE: "Direct message",
  THREAD_REPLY_NOTICE: "Reply notice",
};

export default async function AdminMessagesPage() {
  const [settings, sentToday, queued, messages, recentEmails] = await Promise.all([
    getSettings(),
    sentTodayCount(),
    queueDepth(),
    prisma.message.findMany({
      include: {
        sender: { select: { name: true } },
        shift: { select: { title: true } },
        _count: { select: { emails: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const gmailMode = (process.env.EMAIL_TRANSPORT ?? "console") === "gmail";
  const gmailUser = process.env.GMAIL_USER?.trim().toLowerCase();
  const replyToMismatch =
    gmailMode &&
    !!settings.replyToEmail &&
    !!gmailUser &&
    settings.replyToEmail.trim().toLowerCase() !== gmailUser;

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle={`${sentToday} of ${settings.dailyEmailBudget} daily emails used · ${queued} queued`}
        action={
          <div className="flex items-center gap-2">
            {gmailMode ? <SyncNowButton /> : null}
            <ButtonLink href="/admin/messages/new" size="sm">✉ New message</ButtonLink>
          </div>
        }
      />

      {replyToMismatch ? (
        <div className="mb-6 rounded-xl bg-warn-soft px-4 py-3 text-sm font-semibold text-warn">
          Replies currently go to {settings.replyToEmail}, but the app reads the {gmailUser}{" "}
          inbox — volunteer replies won&apos;t appear in conversations until those match.
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-extrabold text-ink">Sent messages</h2>
          {messages.length === 0 ? (
            <EmptyState title="No broadcasts yet" hint="Messages you or board members compose show up here." />
          ) : (
            <div className="space-y-2">
              {messages.map((m) => (
                <Card key={m.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink">{m.subject}</p>
                      <p className="text-xs text-ink-soft">
                        {m.sender.name} → {m.shift?.title ?? (m.category === "COACHING" ? "All coaching volunteers" : m.audienceType === "ALL_ACTIVE" ? "Everyone" : `${m.userIds.length || m._count.emails} people`)}{" "}
                        · {m._count.emails} email{m._count.emails === 1 ? "" : "s"} ·{" "}
                        {formatInTimeZone(m.createdAt, TZ, "MMM d, h:mm a")}
                      </p>
                    </div>
                    <Badge tone={m.status === "SENT" ? "green" : m.status === "PARTIAL" ? "amber" : "neutral"}>
                      {m.status === "PARTIAL" ? "Partly queued" : m.status.toLowerCase()}
                    </Badge>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-ink-soft">{m.body}</p>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-extrabold text-ink">Outbox (every email)</h2>
          <Card className="divide-y divide-line p-0">
            {recentEmails.map((e) => (
              <Link
                key={e.id}
                href={`/admin/messages/email/${e.id}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-paper"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-ink">
                    {KIND_LABEL[e.kind] ?? e.kind}: {e.subject}
                  </p>
                  <p className="truncate text-xs text-ink-soft">
                    to {e.user?.name ?? e.toEmail} ·{" "}
                    {formatInTimeZone(e.createdAt, TZ, "MMM d, h:mm a")}
                    {e.lastError ? ` · ${e.lastError.slice(0, 60)}` : ""}
                  </p>
                </div>
                <Badge
                  tone={
                    e.status === "SENT"
                      ? "green"
                      : e.status === "QUEUED"
                        ? "amber"
                        : e.status === "FAILED"
                          ? "red"
                          : "neutral"
                  }
                >
                  {e.status.toLowerCase()}
                </Badge>
              </Link>
            ))}
            {recentEmails.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-faint">Nothing sent yet.</p>
            ) : null}
          </Card>
        </section>
      </div>
    </div>
  );
}
