import Link from "next/link";
import { prisma } from "@/lib/db";
import { now } from "@/lib/clock";
import { Card, PageHeader, Badge, EmptyState, Input } from "@/components/ui";
import { unreadByUserForManager } from "@/lib/queries/threads";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/dates";

export const metadata = { title: "Volunteers · Admin" };
export const dynamic = "force-dynamic";

export default async function VolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q = "" }, currentTime] = await Promise.all([searchParams, now()]);
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      _count: {
        select: {
          signups: {
            where: {
              status: { in: ["CONFIRMED", "CHECKED_IN"] },
              shift: { endsAt: { gte: currentTime } },
            },
          },
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  const unread = await unreadByUserForManager();

  return (
    <div>
      <PageHeader
        title="Volunteers"
        subtitle={`${users.filter((u) => u.isActive).length} active · share the signup link to grow the crew`}
      />

      <form className="mb-4 max-w-sm">
        <Input name="q" placeholder="Search by name or email…" defaultValue={q} />
      </form>

      {users.length === 0 ? (
        <EmptyState title="Nobody matches that search" />
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Link key={u.id} href={`/admin/volunteers/${u.id}`} className="block">
              <Card className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors hover:border-ted">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-ink">{u.name}</p>
                    {u.role === "MANAGER" ? <Badge tone="red">Manager</Badge> : null}
                    {u.role === "BOARD" ? <Badge tone="blue">Board</Badge> : null}
                    {!u.isActive ? <Badge tone="amber">Deactivated</Badge> : null}
                    {unread.get(u.id) ? (
                      <Badge tone="red">
                        💬 {unread.get(u.id)} new
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-ink-soft">
                    {u.email}
                    {u.phone ? ` · ${u.phone}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-ink-soft">
                  <span className="font-bold text-ink">
                    {u._count.signups} upcoming shift{u._count.signups === 1 ? "" : "s"}
                  </span>
                  <span>
                    {u.lastSeenAt
                      ? `seen ${formatInTimeZone(u.lastSeenAt, TZ, "MMM d")}`
                      : "never signed in"}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
