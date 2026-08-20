import "server-only";
import { prisma } from "@/lib/db";

/** Read-side helpers for conversation threads. */

export interface ThreadMessageView {
  id: string;
  direction: "FROM_TEAM" | "FROM_MEMBER";
  source: "APP" | "EMAIL";
  subject: string | null;
  body: string;
  createdAtIso: string;
  authorName: string | null;
}

export async function getThread(userId: string): Promise<ThreadMessageView[]> {
  const rows = await prisma.threadMessage.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { author: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    direction: r.direction,
    source: r.source,
    subject: r.subject,
    body: r.body,
    createdAtIso: r.createdAt.toISOString(),
    authorName: r.author?.name ?? null,
  }));
}

export async function unreadCountForMember(userId: string): Promise<number> {
  return prisma.threadMessage.count({ where: { userId, unreadForMember: true } });
}

export async function unreadByUserForManager(): Promise<Map<string, number>> {
  const groups = await prisma.threadMessage.groupBy({
    by: ["userId"],
    where: { unreadForManager: true },
    _count: { _all: true },
  });
  return new Map(groups.map((g) => [g.userId, g._count._all]));
}

export async function totalUnreadForManager(): Promise<number> {
  return prisma.threadMessage.count({ where: { unreadForManager: true } });
}
