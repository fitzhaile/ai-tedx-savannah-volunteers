"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireBoard } from "@/lib/auth";
import { resolveAudience, describeAudience, type AudienceSpec } from "@/lib/messaging";
import { enqueueEmail, drainOutbox } from "@/lib/email/outbox";

export interface SendMessageState {
  error?: string;
  sentTo?: number;
  deferred?: number;
  audienceLabel?: string;
}

const specSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ALL_ACTIVE") }),
  z.object({ type: z.literal("CATEGORY"), category: z.enum(["EVENT", "COACHING", "GENERAL"]) }),
  z.object({ type: z.literal("SHIFT"), shiftId: z.string().min(1) }),
  z.object({ type: z.literal("OWNED_ALL") }),
  z.object({ type: z.literal("USERS"), userIds: z.array(z.string()).min(1).max(200) }),
]);

function parseSpec(raw: string): AudienceSpec | null {
  try {
    const parsed = specSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Live recipient preview for the composer. */
export async function previewAudienceAction(
  rawSpec: string
): Promise<{ count: number; names: string[] }> {
  const sender = await requireBoard();
  const spec = parseSpec(rawSpec);
  if (!spec) return { count: 0, names: [] };
  const users = await resolveAudience(sender, spec);
  return { count: users.length, names: users.slice(0, 12).map((u) => u.name) };
}

const messageSchema = z.object({
  subject: z.string().trim().min(2, "Add a subject").max(150),
  body: z.string().trim().min(2, "Write a message").max(5000),
  spec: z.string(),
});

export async function sendMessageAction(
  _prev: SendMessageState,
  formData: FormData
): Promise<SendMessageState> {
  const sender = await requireBoard();
  const parsed = messageSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
    spec: formData.get("spec"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const spec = parseSpec(parsed.data.spec);
  if (!spec) return { error: "Pick who this goes to" };

  const recipients = await resolveAudience(sender, spec);
  if (recipients.length === 0) {
    return { error: "Nobody matches that audience (or you don't have access to it)" };
  }

  const message = await prisma.message.create({
    data: {
      senderId: sender.id,
      audienceType:
        spec.type === "OWNED_ALL" ? "USERS" : spec.type === "USERS" ? "USERS" : spec.type,
      shiftId: spec.type === "SHIFT" ? spec.shiftId : null,
      category: spec.type === "CATEGORY" ? spec.category : null,
      userIds:
        spec.type === "USERS"
          ? spec.userIds
          : spec.type === "OWNED_ALL"
            ? recipients.map((r) => r.id)
            : [],
      subject: parsed.data.subject,
      body: parsed.data.body,
    },
  });

  for (const r of recipients) {
    await enqueueEmail({
      kind: "BROADCAST",
      toEmail: r.email,
      userId: r.id,
      linkPath: "/me",
      messageId: message.id,
      params: {
        name: r.name,
        subject: parsed.data.subject,
        body: parsed.data.body,
        senderName: sender.name,
      },
    });
  }

  await drainOutbox();
  const stillQueued = await prisma.emailLog.count({
    where: { messageId: message.id, status: "QUEUED" },
  });
  await prisma.message.update({
    where: { id: message.id },
    data: { status: stillQueued > 0 ? "PARTIAL" : "SENT", sentAt: new Date() },
  });

  revalidatePath("/admin/messages");
  return {
    sentTo: recipients.length - stillQueued,
    deferred: stillQueued,
    audienceLabel: await describeAudience(spec),
  };
}
