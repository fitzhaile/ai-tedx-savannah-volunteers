import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { Card, PageHeader, Badge, ButtonLink, EmptyState } from "@/components/primitives";
import { VolunteerEditForm, VolunteerTools } from "@/components/client/VolunteerAdmin";
import { ThreadPanel } from "@/components/client/ThreadPanel";
import { getThread } from "@/lib/queries/threads";
import { fmtShiftWhen } from "@/lib/dates";

export const metadata = { title: "Volunteer · Admin" };
export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, { label: string; tone: "green" | "amber" | "red" | "neutral" }> = {
  CONFIRMED: { label: "Confirmed", tone: "green" },
  CHECKED_IN: { label: "Checked in", tone: "green" },
  WAITLISTED: { label: "Waitlist", tone: "amber" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  NO_SHOW: { label: "No-show", tone: "red" },
};

export default async function VolunteerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const manager = await requireManager();
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      signups: { include: { shift: true }, orderBy: { shift: { startsAt: "desc" } } },
    },
  });
  if (!user) notFound();
  const thread = user.role === "MANAGER" ? null : await getThread(user.id);

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {user.name}
            {user.role === "BOARD" ? <Badge tone="blue">Board</Badge> : null}
            {user.role === "MANAGER" ? <Badge tone="red">Manager</Badge> : null}
            {!user.isActive ? <Badge tone="amber">Deactivated</Badge> : null}
          </span>
        }
        subtitle={`${user.email}${user.phone ? ` · ${user.phone}` : ""}`}
        action={
          <div className="flex gap-2">
            <ButtonLink href={`/admin/messages/new?user=${user.id}`} variant="secondary" size="sm">
              ✉ Email {user.name.split(" ")[0]}
            </ButtonLink>
            <ButtonLink href="/admin/volunteers" variant="ghost" size="sm">
              ← All volunteers
            </ButtonLink>
          </div>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-sm font-bold text-foreground">Contact & notes</h2>
            <VolunteerEditForm user={user} />
          </Card>
          <Card>
            <h2 className="mb-4 text-sm font-bold text-foreground">Tools</h2>
            <VolunteerTools
              userId={user.id}
              name={user.name}
              isActive={user.isActive}
              isSelf={user.id === manager.id}
            />
          </Card>
        </div>

        <div className="space-y-6">
        {thread !== null ? (
          <Card>
            <h2 className="mb-3 text-sm font-bold text-foreground">Conversation</h2>
            <ThreadPanel
              viewer="manager"
              threadUserId={user.id}
              counterpartName={user.name.split(" ")[0]}
              messages={thread}
            />
          </Card>
        ) : null}
        <Card>
          <h2 className="mb-3 text-sm font-bold text-foreground">Shift history</h2>
          {user.signups.length === 0 ? (
            <EmptyState title="No signups yet" />
          ) : (
            <div className="space-y-2">
              {user.signups.map((s) => {
                const b = STATUS_BADGE[s.status];
                return (
                  <div
                    key={s.id}
                    className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/shifts/${s.shiftId}`}
                        className="text-sm font-bold text-foreground hover:underline"
                      >
                        {s.shift.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {fmtShiftWhen(s.shift.startsAt, s.shift.endsAt)}
                      </p>
                      {s.cancelNote ? (
                        <p className="mt-0.5 text-xs text-muted-foreground italic">“{s.cancelNote}”</p>
                      ) : null}
                    </div>
                    <Badge tone={b.tone}>{b.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        </div>
      </div>
    </div>
  );
}
