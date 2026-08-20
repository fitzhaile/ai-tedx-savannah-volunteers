import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser, type AddressObject, type ParsedMail } from "mailparser";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { extractReply } from "@/lib/email/reply-clean";

/**
 * Two-way Gmail sync for conversation threads.
 *
 * INBOX: any email from a known member (or a reply that references an
 * app-sent email — matched via In-Reply-To/References against
 * email_log.providerId) becomes a FROM_MEMBER thread message.
 * SENT: email the manager wrote directly in Gmail to a member becomes a
 * FROM_TEAM thread message; app-sent mail is skipped (X-TEDx-App header,
 * providerId match).
 *
 * All ingestion — real or simulated from the dev panel — goes through
 * ingestInboundEmail so there is exactly one set of rules.
 *
 * Cursors/lastImapSyncAt use REAL time (sanctioned exception to the now()
 * rule — they describe the actual mailbox, not the simulated season).
 */

export interface InboundEmail {
  mailbox: "inbox" | "sent";
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
  from: string | null; // lowercased address
  to: string[]; // lowercased To + Cc addresses
  subject: string | null;
  text: string | null;
  html: string | null;
  date: Date | null;
  hasAppHeader: boolean;
}

export type IngestOutcome =
  | { ok: true; threadMessageId: string; userId: string }
  | {
      ok: false;
      skipped:
        | "self"
        | "unknown-sender"
        | "duplicate"
        | "app-sent"
        | "no-member-recipient";
    };

export type SyncResult =
  | { ran: true; ingested: number; skipped: number; errors: string[] }
  | { ran: false; reason: string };

const MAX_MESSAGES_PER_RUN = 50;
const MAX_MESSAGE_BYTES = 2_000_000;

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

async function selfEmails(): Promise<Set<string>> {
  const set = new Set<string>();
  const gmailUser = process.env.GMAIL_USER?.trim().toLowerCase();
  if (gmailUser) set.add(gmailUser);
  const managers = await prisma.user.findMany({ where: { role: "MANAGER" } });
  for (const m of managers) set.add(m.email.toLowerCase());
  return set;
}

export async function ingestInboundEmail(
  msg: InboundEmail,
  opts?: { at?: Date }
): Promise<IngestOutcome> {
  const createdAt = opts?.at ?? msg.date ?? new Date();
  const body = extractReply(msg.text, msg.html);
  const subject = msg.subject?.trim() || null;

  if (msg.mailbox === "inbox") {
    const self = await selfEmails();
    if (msg.from && self.has(msg.from)) return { ok: false, skipped: "self" };

    // 1) Reply correlation: In-Reply-To / References against our sent mail.
    //    This wins even when From doesn't match the member's stored address
    //    (e.g. plus-addressed demo volunteers replying from the base inbox).
    let ownerId: string | null = null;
    const refs = [msg.inReplyTo, ...msg.references].filter(
      (r): r is string => !!r && r.trim().length > 0
    );
    if (refs.length > 0) {
      const log = await prisma.emailLog.findFirst({
        where: { providerId: { in: refs }, userId: { not: null } },
        include: { user: true },
      });
      if (log?.user && log.user.role !== "MANAGER") ownerId = log.user.id;
    }

    // 2) Sender matches a known active member.
    if (!ownerId && msg.from) {
      const user = await prisma.user.findFirst({
        where: { email: msg.from, isActive: true, role: { not: "MANAGER" } },
      });
      if (user) ownerId = user.id;
    }

    if (!ownerId) return { ok: false, skipped: "unknown-sender" };

    try {
      const row = await prisma.threadMessage.create({
        data: {
          userId: ownerId,
          direction: "FROM_MEMBER",
          source: "EMAIL",
          authorId: ownerId,
          subject,
          body,
          emailMessageId: msg.messageId,
          unreadForManager: true,
          createdAt,
        },
      });
      return { ok: true, threadMessageId: row.id, userId: ownerId };
    } catch (e) {
      if (isUniqueViolation(e)) return { ok: false, skipped: "duplicate" };
      throw e;
    }
  }

  // SENT mailbox
  if (msg.hasAppHeader) return { ok: false, skipped: "app-sent" };
  if (msg.messageId) {
    const appSent = await prisma.emailLog.findFirst({
      where: { providerId: msg.messageId },
    });
    if (appSent) return { ok: false, skipped: "app-sent" };
  }

  const members = await prisma.user.findMany({
    where: { email: { in: msg.to }, role: { not: "MANAGER" } },
  });
  if (members.length === 0) return { ok: false, skipped: "no-member-recipient" };

  const author = msg.from
    ? await prisma.user.findFirst({ where: { email: msg.from, role: "MANAGER" } })
    : null;

  let last: { threadMessageId: string; userId: string } | null = null;
  let allDuplicate = true;
  for (const member of members) {
    try {
      const row = await prisma.threadMessage.create({
        data: {
          userId: member.id,
          direction: "FROM_TEAM",
          source: "EMAIL",
          authorId: author?.id ?? null,
          subject,
          body,
          emailMessageId: msg.messageId,
          unreadForMember: true,
          createdAt,
        },
      });
      last = { threadMessageId: row.id, userId: member.id };
      allDuplicate = false;
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
  if (last) return { ok: true, ...last };
  return { ok: false, skipped: allDuplicate ? "duplicate" : "no-member-recipient" };
}

function addressList(a: AddressObject | AddressObject[] | undefined): string[] {
  const objs = Array.isArray(a) ? a : a ? [a] : [];
  return objs
    .flatMap((o) => o.value ?? [])
    .map((v) => v.address?.toLowerCase().trim())
    .filter((v): v is string => !!v);
}

export function toInboundEmail(parsed: ParsedMail, mailbox: "inbox" | "sent"): InboundEmail {
  const refs = parsed.references;
  return {
    mailbox,
    messageId: parsed.messageId?.trim() ?? null,
    inReplyTo: parsed.inReplyTo?.trim() ?? null,
    references: (Array.isArray(refs) ? refs : refs ? [refs] : []).map((r) => r.trim()),
    from: addressList(parsed.from)[0] ?? null,
    to: [...addressList(parsed.to), ...addressList(parsed.cc)],
    subject: parsed.subject ?? null,
    text: parsed.text ?? null,
    html: typeof parsed.html === "string" ? parsed.html : null,
    date: parsed.date ?? null,
    hasAppHeader: parsed.headers.has("x-tedx-app"),
  };
}

type BoxKey = "inbox" | "sent";
const CURSOR_FIELDS: Record<BoxKey, { uidNext: "inboxUidNext" | "sentUidNext"; uidValidity: "inboxUidValidity" | "sentUidValidity" }> = {
  inbox: { uidNext: "inboxUidNext", uidValidity: "inboxUidValidity" },
  sent: { uidNext: "sentUidNext", uidValidity: "sentUidValidity" },
};

export async function syncGmailThreads(opts?: { force?: boolean }): Promise<SyncResult> {
  if ((process.env.EMAIL_TRANSPORT ?? "console") !== "gmail") {
    return { ran: false, reason: "email transport is not gmail" };
  }
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return { ran: false, reason: "Gmail credentials not set" };

  // Atomic throttle + concurrency lock: only one claimant may sync at a time.
  const throttleMs = opts?.force ? 30_000 : 4 * 60_000;
  const cutoff = new Date(Date.now() - throttleMs);
  const claimed = await prisma.settings.updateMany({
    where: { id: 1, OR: [{ lastImapSyncAt: null }, { lastImapSyncAt: { lt: cutoff } }] },
    data: { lastImapSyncAt: new Date() },
  });
  if (claimed.count === 0) return { ran: false, reason: "synced very recently" };

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });

  let ingested = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    await client.connect();

    const listed = await client.list();
    const sentPath =
      listed.find((m) => m.specialUse === "\\Sent")?.path ?? "[Gmail]/Sent Mail";
    const boxes: { key: BoxKey; path: string }[] = [
      { key: "inbox", path: "INBOX" },
      { key: "sent", path: sentPath },
    ];

    let budget = MAX_MESSAGES_PER_RUN;
    for (const box of boxes) {
      if (budget <= 0) break;
      const fields = CURSOR_FIELDS[box.key];
      const lock = await client.getMailboxLock(box.path);
      try {
        const mailbox = client.mailbox;
        if (!mailbox || typeof mailbox === "boolean") continue;
        const uidValidity = String(mailbox.uidValidity ?? "");
        const uidNext = Number(mailbox.uidNext ?? 1);

        const settings = await prisma.settings.findUnique({ where: { id: 1 } });
        const storedNext = settings?.[fields.uidNext] ?? null;
        const storedValidity = settings?.[fields.uidValidity] ?? null;

        // First sync ever, or the mailbox was rebuilt: fast-forward without
        // ingesting history.
        if (storedNext == null || storedValidity !== uidValidity) {
          await prisma.settings.update({
            where: { id: 1 },
            data: { [fields.uidNext]: uidNext, [fields.uidValidity]: uidValidity },
          });
          continue;
        }
        if (uidNext <= storedNext) continue;

        const found = await client.search({ uid: `${storedNext}:*` }, { uid: true });
        // "X:*" always includes the highest-UID message, even below X.
        const uids = (found || [])
          .filter((u) => u >= storedNext)
          .sort((a, b) => a - b)
          .slice(0, budget);
        if (uids.length === 0) {
          await prisma.settings.update({
            where: { id: 1 },
            data: { [fields.uidNext]: uidNext },
          });
          continue;
        }

        let maxUid = storedNext - 1;
        for await (const msg of client.fetch(
          uids.join(","),
          { uid: true, source: true, size: true },
          { uid: true }
        )) {
          maxUid = Math.max(maxUid, msg.uid);
          budget -= 1;
          if ((msg.size ?? 0) > MAX_MESSAGE_BYTES) {
            skipped += 1;
            continue;
          }
          try {
            if (!msg.source) continue;
            const parsed = await simpleParser(msg.source);
            const outcome = await ingestInboundEmail(toInboundEmail(parsed, box.key));
            if (outcome.ok) ingested += 1;
            else skipped += 1;
          } catch (e) {
            errors.push(`${box.key} uid ${msg.uid}: ${e instanceof Error ? e.message : e}`);
          }
        }

        await prisma.settings.update({
          where: { id: 1 },
          data: { [fields.uidNext]: maxUid + 1 },
        });
      } finally {
        lock.release();
      }
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }

  return { ran: true, ingested, skipped, errors };
}
