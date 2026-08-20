import "server-only";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Audience resolution for composed messages.
 * Board members can only reach volunteers on shifts they own; the manager can
 * reach everyone. Every path returns distinct, active users minus the sender.
 */

export type AudienceSpec =
  | { type: "ALL_ACTIVE" }
  | { type: "CATEGORY"; category: "EVENT" | "COACHING" | "GENERAL" }
  | { type: "SHIFT"; shiftId: string }
  | { type: "OWNED_ALL" } // every volunteer across the sender's owned shifts
  | { type: "USERS"; userIds: string[] };

export async function resolveAudience(sender: User, spec: AudienceSpec): Promise<User[]> {
  const isManager = sender.role === "MANAGER";
  let users: User[] = [];

  switch (spec.type) {
    case "ALL_ACTIVE": {
      if (!isManager) return [];
      users = await prisma.user.findMany({ where: { isActive: true } });
      break;
    }
    case "CATEGORY": {
      if (!isManager) return [];
      users = await prisma.user.findMany({
        where: {
          isActive: true,
          signups: {
            some: {
              status: { in: ["CONFIRMED", "CHECKED_IN"] },
              shift: { category: spec.category },
            },
          },
        },
      });
      break;
    }
    case "SHIFT": {
      const shift = await prisma.shift.findUnique({ where: { id: spec.shiftId } });
      if (!shift) return [];
      if (!isManager && shift.ownerId !== sender.id) return [];
      users = await prisma.user.findMany({
        where: {
          isActive: true,
          signups: {
            some: { shiftId: spec.shiftId, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
          },
        },
      });
      break;
    }
    case "OWNED_ALL": {
      users = await prisma.user.findMany({
        where: {
          isActive: true,
          signups: {
            some: {
              status: { in: ["CONFIRMED", "CHECKED_IN"] },
              shift: { ownerId: sender.id },
            },
          },
        },
      });
      break;
    }
    case "USERS": {
      if (!isManager) return [];
      users = await prisma.user.findMany({
        where: { isActive: true, id: { in: spec.userIds } },
      });
      break;
    }
  }

  return users.filter((u) => u.id !== sender.id);
}

export async function describeAudience(spec: AudienceSpec): Promise<string> {
  switch (spec.type) {
    case "ALL_ACTIVE":
      return "Everyone (all active people)";
    case "CATEGORY":
      return spec.category === "COACHING"
        ? "All speaker-coaching volunteers"
        : `All ${spec.category.toLowerCase()} volunteers`;
    case "SHIFT": {
      const shift = await prisma.shift.findUnique({ where: { id: spec.shiftId } });
      return shift ? `Roster: ${shift.title}` : "Roster";
    }
    case "OWNED_ALL":
      return "All volunteers on my shifts";
    case "USERS":
      return spec.userIds.length === 1 ? "One person" : `${spec.userIds.length} selected people`;
  }
}
