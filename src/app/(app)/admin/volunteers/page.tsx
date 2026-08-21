import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { now } from "@/lib/clock";
import { PageHeader, Badge, EmptyState, Input, ButtonLink } from "@/components/primitives";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
        action={<ButtonLink href="/admin/board" variant="secondary" size="sm">Board members</ButtonLink>}
      />

      <form className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" placeholder="Search by name or email…" defaultValue={q} className="pl-9" />
      </form>

      {users.length === 0 ? (
        <EmptyState title="Nobody matches that search" />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="text-right">Upcoming</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Last seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/admin/volunteers/${u.id}`} className="block">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{u.name}</span>
                        {u.role === "MANAGER" ? <Badge tone="red">Manager</Badge> : null}
                        {u.role === "BOARD" ? <Badge tone="blue">Board</Badge> : null}
                        {!u.isActive ? <Badge tone="amber">Deactivated</Badge> : null}
                        {unread.get(u.id) ? <Badge tone="red">💬 {unread.get(u.id)} new</Badge> : null}
                      </span>
                      <span className="block text-xs text-muted-foreground md:hidden">{u.email}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {u.email}
                    {u.phone ? ` · ${u.phone}` : ""}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {u._count.signups} shift{u._count.signups === 1 ? "" : "s"}
                  </TableCell>
                  <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                    {u.lastSeenAt ? formatInTimeZone(u.lastSeenAt, TZ, "MMM d") : "never"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
