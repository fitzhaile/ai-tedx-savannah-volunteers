import "server-only";
import type { EmailLog, Shift, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendNow } from "@/lib/email/outbox";
import { fmtShiftWhen, fmtDateShort } from "@/lib/dates";
import type { EmailParams } from "@/lib/email/templates";

/** Domain events -> transactional emails. Bulk email lives in scheduler/messages. */

export function shiftParams(shift: Shift): EmailParams {
  return {
    shiftTitle: shift.title,
    when: fmtShiftWhen(shift.startsAt, shift.endsAt),
    whenShort: fmtDateShort(shift.startsAt),
    location: shift.location ?? undefined,
  };
}

export async function notifyWelcome(user: User): Promise<void> {
  await sendNow({
    kind: "WELCOME",
    toEmail: user.email,
    userId: user.id,
    linkPath: "/shifts",
    params: { name: user.name },
  });
}

export async function notifyMagicLink(user: User): Promise<void> {
  await sendNow({
    kind: "MAGIC_LINK",
    toEmail: user.email,
    userId: user.id,
    linkPath: "/",
    params: { name: user.name },
  });
}

export async function notifyBoardInvite(user: User, inviter: User): Promise<void> {
  await sendNow({
    kind: "BOARD_INVITE",
    toEmail: user.email,
    userId: user.id,
    linkPath: "/board",
    params: { name: user.name, inviterName: inviter.name },
  });
}

export async function notifySignupConfirmed(user: User, shift: Shift): Promise<void> {
  await sendNow({
    kind: "SIGNUP_CONFIRM",
    toEmail: user.email,
    userId: user.id,
    linkPath: "/me",
    params: { name: user.name, ...shiftParams(shift) },
  });
}

export async function notifyCancelConfirmed(user: User, shift: Shift): Promise<void> {
  await sendNow({
    kind: "CANCEL_CONFIRM",
    toEmail: user.email,
    userId: user.id,
    linkPath: "/shifts",
    params: { name: user.name, ...shiftParams(shift) },
  });
}

/** Alert the manager(s) + the shift's owning board member about a cancellation. */
export async function notifyCancelAlert(
  shift: Shift,
  volunteer: User,
  note: string | null
): Promise<void> {
  const [managers, owner, spotsFilled, waitlistCount] = await Promise.all([
    prisma.user.findMany({ where: { role: "MANAGER", isActive: true } }),
    shift.ownerId ? prisma.user.findUnique({ where: { id: shift.ownerId } }) : null,
    prisma.signup.count({
      where: { shiftId: shift.id, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
    }),
    prisma.signup.count({ where: { shiftId: shift.id, status: "WAITLISTED" } }),
  ]);

  const recipients = new Map<string, { user: User; linkPath: string }>();
  for (const m of managers) {
    recipients.set(m.id, { user: m, linkPath: `/admin/shifts/${shift.id}` });
  }
  if (owner && owner.isActive && !recipients.has(owner.id)) {
    recipients.set(owner.id, { user: owner, linkPath: "/board" });
  }

  await Promise.all(
    [...recipients.values()].map(({ user, linkPath }) =>
      sendNow({
        kind: "CANCEL_ALERT",
        toEmail: user.email,
        userId: user.id,
        linkPath,
        params: {
          volunteerName: volunteer.name,
          note: note ?? undefined,
          spotsFilled,
          capacity: shift.capacity,
          waitlistCount,
          ...shiftParams(shift),
        },
      })
    )
  );
}

export async function notifyRemoved(user: User, shift: Shift, note: string | null): Promise<void> {
  await sendNow({
    kind: "REMOVED_NOTICE",
    toEmail: user.email,
    userId: user.id,
    linkPath: "/shifts",
    params: { name: user.name, note: note ?? undefined, ...shiftParams(shift) },
  });
}

/**
 * A direct thread message from the team to one member. Returns the outbox
 * row so the caller can link it to the ThreadMessage (emailLogId).
 */
export async function notifyDirectMessage(
  member: User,
  sender: User,
  body: string
): Promise<EmailLog | null> {
  return sendNow({
    kind: "DIRECT_MESSAGE",
    toEmail: member.email,
    userId: member.id,
    linkPath: "/me/messages",
    params: { name: member.name, senderName: sender.name, body },
  });
}

/** Tell the manager(s) a member wrote in the app (email replies skip this). */
export async function notifyThreadReplyNotice(member: User, body: string): Promise<void> {
  const managers = await prisma.user.findMany({ where: { role: "MANAGER", isActive: true } });
  await Promise.all(
    managers.map((m) =>
      sendNow({
        kind: "THREAD_REPLY_NOTICE",
        toEmail: m.email,
        userId: m.id,
        linkPath: `/admin/volunteers/${member.id}`,
        params: { memberName: member.name, body },
      })
    )
  );
}

/** Tell everyone on the waitlist a spot opened. First claim wins. */
export async function notifySpotOpened(shift: Shift): Promise<void> {
  const waitlisted = await prisma.signup.findMany({
    where: { shiftId: shift.id, status: "WAITLISTED", user: { isActive: true } },
    include: { user: true },
  });
  await Promise.all(
    waitlisted.map((s) =>
      sendNow({
        kind: "SPOT_OPENED",
        toEmail: s.user.email,
        userId: s.userId,
        linkPath: `/shifts?claim=${shift.id}`,
        params: { name: s.user.name, ...shiftParams(shift) },
      })
    )
  );
}
