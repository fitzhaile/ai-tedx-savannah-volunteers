import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * The only place that talks to an email provider.
 * EMAIL_TRANSPORT=console  -> nothing leaves the app (rows still land in the outbox)
 * EMAIL_TRANSPORT=gmail    -> SMTP through the manager's Gmail (app password)
 * A future switch (e.g. Resend + custom domain) only touches this file.
 */

export type SendResult = { ok: true; providerId: string } | { ok: false; error: string };

let gmailTransport: Transporter | null = null;

function getGmailTransport(): Transporter {
  if (!gmailTransport) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD not set");
    gmailTransport = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  }
  return gmailTransport;
}

export async function deliver(opts: {
  to: string;
  subject: string;
  html: string;
  fromName: string;
  replyTo?: string | null;
}): Promise<SendResult> {
  const mode = process.env.EMAIL_TRANSPORT ?? "console";

  if (mode === "console") {
    console.log(`[email:console] to=${opts.to} subject="${opts.subject}"`);
    return { ok: true, providerId: `console-${Date.now()}` };
  }

  if (mode === "gmail") {
    try {
      const transport = getGmailTransport();
      const info = await transport.sendMail({
        from: { name: opts.fromName, address: process.env.GMAIL_USER! },
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        replyTo: opts.replyTo ?? undefined,
        // Marks app-sent mail so the IMAP Sent-folder sync never re-ingests it.
        headers: { "X-TEDx-App": "1" },
      });
      return { ok: true, providerId: info.messageId ?? "gmail" };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  return { ok: false, error: `Unknown EMAIL_TRANSPORT "${mode}"` };
}
