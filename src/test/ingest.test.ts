import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { ingestInboundEmail, type InboundEmail } from "@/lib/email/imap-sync";

const MEMBER_EMAIL = "ingest-member@example.test";
const OTHER_EMAIL = "ingest-other@example.test";

function inbound(overrides: Partial<InboundEmail>): InboundEmail {
  return {
    mailbox: "inbox",
    messageId: `<t-${Math.random().toString(36).slice(2)}@example.test>`,
    inReplyTo: null,
    references: [],
    from: MEMBER_EMAIL,
    to: [],
    subject: "Re: Shift",
    text: "Count me in!",
    html: null,
    date: new Date("2027-05-01T12:00:00Z"),
    hasAppHeader: false,
    ...overrides,
  };
}

describe("ingestInboundEmail", () => {
  let memberId = "";
  let otherId = "";
  let managerEmail = "";

  beforeAll(async () => {
    const manager = await prisma.user.findFirstOrThrow({ where: { role: "MANAGER" } });
    managerEmail = manager.email;
    const member = await prisma.user.create({
      data: { email: MEMBER_EMAIL, name: "Ingest Member" },
    });
    memberId = member.id;
    const other = await prisma.user.create({
      data: { email: OTHER_EMAIL, name: "Ingest Other" },
    });
    otherId = other.id;
    // An app-sent email to the member, as the outbox records it.
    await prisma.emailLog.create({
      data: {
        kind: "DIRECT_MESSAGE",
        userId: memberId,
        toEmail: MEMBER_EMAIL,
        subject: "Hi",
        status: "SENT",
        providerId: "<app-sent-1@example.test>",
      },
    });
    // An app email whose recipient is the manager (e.g. a CANCEL_ALERT).
    await prisma.emailLog.create({
      data: {
        kind: "CANCEL_ALERT",
        userId: manager.id,
        toEmail: manager.email,
        subject: "Alert",
        status: "SENT",
        providerId: "<to-manager-1@example.test>",
      },
    });
  });

  afterAll(async () => {
    await prisma.threadMessage.deleteMany({
      where: { user: { email: { endsWith: "@example.test" } } },
    });
    await prisma.emailLog.deleteMany({ where: { toEmail: { endsWith: "@example.test" } } });
    await prisma.user.deleteMany({ where: { email: { in: [MEMBER_EMAIL, OTHER_EMAIL] } } });
    await prisma.$disconnect();
  });

  it("lands a reply in the right thread via In-Reply-To even when From is unknown", async () => {
    const result = await ingestInboundEmail(
      inbound({
        from: "totally-different@example.test",
        inReplyTo: "<app-sent-1@example.test>",
        text: "Replying from my other account",
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.userId).toBe(memberId);
    const row = await prisma.threadMessage.findFirst({
      where: { userId: memberId, body: "Replying from my other account" },
    });
    expect(row?.direction).toBe("FROM_MEMBER");
    expect(row?.source).toBe("EMAIL");
    expect(row?.unreadForManager).toBe(true);
  });

  it("falls back to From matching when there are no references", async () => {
    const result = await ingestInboundEmail(inbound({ text: "Fresh email, no refs" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.userId).toBe(memberId);
  });

  it("skips unknown senders", async () => {
    const result = await ingestInboundEmail(
      inbound({ from: "stranger@example.test" })
    );
    expect(result).toEqual({ ok: false, skipped: "unknown-sender" });
  });

  it("references resolving to a manager-recipient log fall through to From", async () => {
    const result = await ingestInboundEmail(
      inbound({ inReplyTo: "<to-manager-1@example.test>", text: "via manager ref" })
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.userId).toBe(memberId);
  });

  it("skips mail from the manager/self", async () => {
    const result = await ingestInboundEmail(inbound({ from: managerEmail }));
    expect(result).toEqual({ ok: false, skipped: "self" });
  });

  it("dedupes on the same Message-ID per thread", async () => {
    const id = "<dupe-1@example.test>";
    const first = await ingestInboundEmail(inbound({ messageId: id, text: "once" }));
    const second = await ingestInboundEmail(inbound({ messageId: id, text: "once" }));
    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, skipped: "duplicate" });
  });

  it("sent mail with the app header is skipped", async () => {
    const result = await ingestInboundEmail(
      inbound({ mailbox: "sent", hasAppHeader: true, to: [MEMBER_EMAIL] })
    );
    expect(result).toEqual({ ok: false, skipped: "app-sent" });
  });

  it("sent mail whose Message-ID matches an app-sent email is skipped", async () => {
    const result = await ingestInboundEmail(
      inbound({ mailbox: "sent", messageId: "<app-sent-1@example.test>", to: [MEMBER_EMAIL] })
    );
    expect(result).toEqual({ ok: false, skipped: "app-sent" });
  });

  it("sent mail to two members creates one row per thread", async () => {
    const result = await ingestInboundEmail(
      inbound({
        mailbox: "sent",
        from: managerEmail,
        to: [MEMBER_EMAIL, OTHER_EMAIL],
        text: "Direct from Gmail",
      })
    );
    expect(result.ok).toBe(true);
    const rows = await prisma.threadMessage.findMany({
      where: { body: "Direct from Gmail" },
    });
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.userId))).toEqual(new Set([memberId, otherId]));
    for (const r of rows) {
      expect(r.direction).toBe("FROM_TEAM");
      expect(r.unreadForMember).toBe(true);
      expect(r.unreadForManager).toBe(false);
    }
  });

  it("sent mail with no member recipient is skipped", async () => {
    const result = await ingestInboundEmail(
      inbound({ mailbox: "sent", to: ["nobody@example.test"] })
    );
    expect(result).toEqual({ ok: false, skipped: "no-member-recipient" });
  });
});
