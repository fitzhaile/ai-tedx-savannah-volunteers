import Link from "next/link";
import { prisma } from "@/lib/db";
import { now } from "@/lib/clock";
import { Card, PageHeader, EmptyState, Badge } from "@/components/primitives";
import { AddBoardForm, BoardRowActions } from "@/components/client/BoardAdmin";
import { unreadByUserForManager } from "@/lib/queries/threads";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/dates";

export const metadata = { title: "Board · Admin" };
export const dynamic = "force-dynamic";

export default async function BoardAdminPage() {
  const currentTime = await now();
  const members = await prisma.user.findMany({
    where: { role: "BOARD" },
    include: {
      _count: {
        select: { ownedShifts: { where: { endsAt: { gte: currentTime } } } },
      },
    },
    orderBy: { name: "asc" },
  });
  const unread = await unreadByUserForManager();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Board members"
        subtitle="Board members see staffing for the shifts they own and can email their volunteers. Assign shifts to them on each shift's edit page."
      />

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-bold text-foreground">Add a board member</h2>
        <AddBoardForm />
      </Card>

      {members.length === 0 ? (
        <EmptyState
          title="No board members yet"
          hint="Add one above — they'll get an email with one-tap access to their dashboard."
        />
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <Card key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <span className="flex items-center gap-2">
                  <Link
                    href={`/admin/volunteers/${m.id}`}
                    className="text-sm font-bold text-foreground hover:underline"
                  >
                    {m.name}
                  </Link>
                  {unread.get(m.id) ? <Badge tone="red">💬 {unread.get(m.id)} new</Badge> : null}
                </span>
                <p className="text-xs text-muted-foreground">
                  {m.email} · owns {m._count.ownedShifts} upcoming shift
                  {m._count.ownedShifts === 1 ? "" : "s"} ·{" "}
                  {m.lastSeenAt
                    ? `seen ${formatInTimeZone(m.lastSeenAt, TZ, "MMM d")}`
                    : "never signed in"}
                </p>
              </div>
              <BoardRowActions userId={m.id} name={m.name} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
