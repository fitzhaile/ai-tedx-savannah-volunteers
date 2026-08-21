import Link from "next/link";
import { prisma } from "@/lib/db";
import { now } from "@/lib/clock";
import { PageHeader, Badge, ButtonLink, EmptyState } from "@/components/primitives";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtShiftWhen } from "@/lib/dates";

export const metadata = { title: "Shifts · Admin" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "Upcoming" },
  { key: "understaffed", label: "Needs people" },
  { key: "EVENT", label: "Event" },
  { key: "COACHING", label: "Coaching" },
  { key: "GENERAL", label: "Other" },
  { key: "past", label: "Past" },
];

export default async function AdminShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const [{ filter = "all" }, currentTime] = await Promise.all([searchParams, now()]);
  const shifts = await prisma.shift.findMany({
    include: {
      signups: { select: { status: true } },
      owner: { select: { name: true } },
      slot: { select: { label: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  const rows = shifts
    .map((s) => ({
      ...s,
      filled: s.signups.filter((x) => x.status === "CONFIRMED" || x.status === "CHECKED_IN").length,
      waitlisted: s.signups.filter((x) => x.status === "WAITLISTED").length,
      isPast: s.endsAt < currentTime,
    }))
    .filter((s) => {
      if (filter === "past") return s.isPast;
      if (s.isPast) return false;
      if (filter === "understaffed") return s.filled < s.capacity;
      if (filter === "EVENT" || filter === "COACHING" || filter === "GENERAL")
        return s.category === filter;
      return true;
    });

  return (
    <div>
      <PageHeader
        title="Shifts"
        subtitle="Create, edit, and staff every shift."
        action={<ButtonLink href="/admin/shifts/new" size="sm">+ New shift</ButtonLink>}
      />

      <Tabs value={filter} className="mb-4">
        <TabsList className="flex h-auto w-full flex-nowrap justify-start overflow-x-auto">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.key} value={f.key} asChild>
              <Link href={f.key === "all" ? "/admin/shifts" : `/admin/shifts?filter=${f.key}`}>
                {f.label}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {rows.length === 0 ? (
        <EmptyState title="No shifts match this filter" />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shift</TableHead>
                <TableHead className="hidden md:table-cell">When</TableHead>
                <TableHead className="hidden lg:table-cell">Lead</TableHead>
                <TableHead className="w-40">Staffing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/admin/shifts/${s.id}`} className="block">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{s.title}</span>
                        {s.category === "COACHING" ? <Badge tone="blue">Coaching</Badge> : null}
                        {!s.isPublished ? <Badge tone="amber">Hidden</Badge> : null}
                        {!s.slot && s.category !== "COACHING" ? <Badge>Custom time</Badge> : null}
                        {s.waitlisted > 0 ? <Badge tone="amber">+{s.waitlisted} waitlist</Badge> : null}
                      </span>
                      <span className="block text-xs text-muted-foreground md:hidden">
                        {fmtShiftWhen(s.startsAt, s.endsAt)}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {fmtShiftWhen(s.startsAt, s.endsAt)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {s.owner?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.round((s.filled / s.capacity) * 100)} className="h-1.5 w-20" />
                      <span className={"text-xs font-semibold " + (s.filled >= s.capacity ? "text-go" : "text-ted")}>
                        {s.filled}/{s.capacity}
                      </span>
                    </div>
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
