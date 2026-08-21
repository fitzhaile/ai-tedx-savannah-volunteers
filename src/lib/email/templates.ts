import type { EmailKind } from "@prisma/client";

/**
 * All outbound email is rendered here from an EmailKind + a JSON params bag
 * (stored on the email_log row). `loginUrl` is a signed one-click sign-in
 * link generated at send time — templates never mint tokens themselves.
 */

export type EmailParams = Record<string, unknown>;

export interface RenderedEmail {
  subject: string;
  html: string;
}

const RED = "#eb0028";
const INK = "#0b0b0c";
const MUTED = "#5a5a60";
const FAINT = "#9a9aa1";
const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";

/** Red kicker line above each headline, per email kind. */
const EYEBROW: Record<EmailKind, string> = {
  MAGIC_LINK: "Sign in",
  WELCOME: "Welcome aboard",
  BOARD_INVITE: "Board access",
  SIGNUP_CONFIRM: "You're confirmed",
  CANCEL_CONFIRM: "Cancelled",
  CANCEL_ALERT: "Roster alert",
  REMOVED_NOTICE: "Roster change",
  REMINDER: "Shift reminder",
  BROADCAST: "From the team",
  SPOT_OPENED: "A spot opened",
  DIRECT_MESSAGE: "New message",
  THREAD_REPLY_NOTICE: "New reply",
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain text with line breaks -> simple paragraphs. */
function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK};">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`
    )
    .join("");
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:3px 16px 3px 0;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${FAINT};white-space:nowrap;vertical-align:baseline;">${label}</td>
    <td style="padding:3px 0;font-size:15px;font-weight:700;letter-spacing:-0.2px;color:${INK};">${escapeHtml(value)}</td>
  </tr>`;
}

/** Shift facts as an editorial block: thin red rule, bold values. */
function shiftDetails(p: EmailParams): string {
  const rows = [
    p.shiftTitle ? detailRow("Shift", String(p.shiftTitle)) : "",
    p.when ? detailRow("When", String(p.when)) : "",
    p.location ? detailRow("Where", String(p.location)) : "",
  ].join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;width:100%;"><tr>
    <td style="border-left:3px solid ${RED};padding:6px 0 6px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tbody>${rows}</tbody></table>
    </td></tr></table>`;
}

function layout(opts: {
  preview: string;
  eyebrow?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
}): string {
  const eyebrow = opts.eyebrow
    ? `<p style="margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${RED};">${escapeHtml(opts.eyebrow)}</p>`
    : "";
  const cta =
    opts.ctaText && opts.ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;"><tr><td style="border-radius:999px;background:${RED};">
           <a href="${opts.ctaUrl}" style="display:inline-block;padding:13px 26px;border-radius:999px;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;letter-spacing:-0.2px;">${escapeHtml(opts.ctaText)}</a>
         </td></tr></table>`
      : "";
  const note = opts.footerNote ?? "Questions? Just reply to this email — it goes straight to the volunteer manager.";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f3;font-family:${FONT};">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(opts.preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;"><tr><td align="center" style="padding:28px 12px 36px;">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
      <tr><td style="background:${INK};padding:18px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-family:${FONT};font-size:19px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">TED<span style="color:${RED};">x</span>Savannah</td>
          <td align="right" style="font-family:${FONT};font-size:10px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#a3a3a8;">Volunteers</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;padding:32px 28px 30px;">
        ${eyebrow}
        ${opts.bodyHtml}
        ${cta}
      </td></tr>
      <tr><td style="padding:18px 4px 0;font-size:12px;line-height:1.7;color:${FAINT};">
        ${note}<br/>
        <span style="color:#b8b8bd;">TEDxSavannah · This independent TEDx event is operated under license from TED.</span>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:27px;line-height:1.12;letter-spacing:-0.7px;font-weight:800;color:${INK};">${escapeHtml(text)}</h1>`;
}

export function buildEmail(kind: EmailKind, p: EmailParams, loginUrl: string): RenderedEmail {
  const name = String(p.name ?? "there");
  switch (kind) {
    case "MAGIC_LINK":
      return {
        subject: "Your TEDxSavannah sign-in link",
        html: layout({
          eyebrow: EYEBROW[kind],
          preview: "Tap to sign in — no password needed.",
          bodyHtml:
            heading("Sign in to TEDxSavannah Volunteers") +
            paragraphs("Tap the button below to sign in. The link works for 15 minutes.\n\nIf you didn't request this, you can ignore this email."),
          ctaText: "Sign in",
          ctaUrl: loginUrl,
        }),
      };
    case "WELCOME":
      return {
        subject: "Welcome to the TEDxSavannah volunteer crew! 🎉",
        html: layout({
          eyebrow: EYEBROW[kind],
          preview: "You're in — browse shifts and grab the ones you want.",
          bodyHtml:
            heading(`Welcome, ${name}!`) +
            paragraphs(
              "You're officially part of the TEDxSavannah volunteer crew. Shifts are first-come, first-served — browse what's open and grab the ones that fit your schedule.\n\nEvery email we send includes a button like the one below that signs you in instantly. No password, ever."
            ),
          ctaText: "Browse shifts",
          ctaUrl: loginUrl,
        }),
      };
    case "BOARD_INVITE":
      return {
        subject: "Your TEDxSavannah board access is ready",
        html: layout({
          eyebrow: EYEBROW[kind],
          preview: "See your shifts' staffing and email your volunteers.",
          bodyHtml:
            heading(`Hi ${name},`) +
            paragraphs(
              `${String(p.inviterName ?? "The volunteer manager")} set you up with board access on the TEDxSavannah volunteer app. Your dashboard shows staffing for the shifts you own, with each volunteer's contact info, and lets you email them directly.`
            ),
          ctaText: "Open my dashboard",
          ctaUrl: loginUrl,
        }),
      };
    case "SIGNUP_CONFIRM":
      return {
        subject: `You're confirmed: ${String(p.shiftTitle)} (${String(p.whenShort ?? p.when)})`,
        html: layout({
          eyebrow: EYEBROW[kind],
          preview: "You're on the roster — details inside.",
          bodyHtml:
            heading(`You're confirmed, ${name}!`) +
            shiftDetails(p) +
            paragraphs("If your plans change, no problem — tap below and cancel so someone else can take the spot."),
          ctaText: "View my shifts",
          ctaUrl: loginUrl,
        }),
      };
    case "CANCEL_CONFIRM":
      return {
        subject: `Cancelled: ${String(p.shiftTitle)}`,
        html: layout({
          eyebrow: EYEBROW[kind],
          preview: "Your spot has been released.",
          bodyHtml:
            heading(`Got it, ${name}`) +
            paragraphs(`You're off the roster for the shift below. Thanks for letting us know — it really helps.`) +
            shiftDetails(p) +
            paragraphs("Want to pick up a different shift instead?"),
          ctaText: "Browse open shifts",
          ctaUrl: loginUrl,
        }),
      };
    case "CANCEL_ALERT": {
      const note = p.note ? `<p style="margin:0 0 14px;padding:10px 14px;background:#fff8f0;border-left:3px solid #f0b429;color:${INK};font-style:italic;">“${escapeHtml(String(p.note))}”</p>` : "";
      return {
        subject: `⚠ ${String(p.volunteerName)} cancelled: ${String(p.shiftTitle)} (${String(p.spotsFilled)}/${String(p.capacity)} filled)`,
        html: layout({
          eyebrow: EYEBROW[kind],
          preview: "A volunteer dropped a shift — the roster needs attention.",
          bodyHtml:
            heading(`${String(p.volunteerName)} cancelled a shift`) +
            shiftDetails(p) +
            note +
            paragraphs(`The roster now has ${String(p.spotsFilled)} of ${String(p.capacity)} spots filled.${p.waitlistCount && Number(p.waitlistCount) > 0 ? ` There ${Number(p.waitlistCount) === 1 ? "is 1 person" : `are ${p.waitlistCount} people`} on the waitlist.` : ""}`),
          ctaText: "Open the roster",
          ctaUrl: loginUrl,
          footerNote: "You're receiving this because you manage this shift.",
        }),
      };
    }
    case "REMOVED_NOTICE": {
      const note = p.note ? paragraphs(`Note from the volunteer manager:\n\n“${String(p.note)}”`) : "";
      return {
        subject: `Roster change: ${String(p.shiftTitle)}`,
        html: layout({
          eyebrow: EYEBROW[kind],
          preview: "You've been taken off a shift.",
          bodyHtml:
            heading(`Hi ${name},`) +
            paragraphs("You've been taken off the roster for this shift:") +
            shiftDetails(p) +
            note +
            paragraphs("Your other shifts (if any) are unchanged. Questions? Just reply to this email."),
          ctaText: "View my shifts",
          ctaUrl: loginUrl,
        }),
      };
    }
    case "REMINDER": {
      const shifts = Array.isArray(p.shifts) ? (p.shifts as Array<Record<string, string>>) : [];
      const list = shifts
        .map(
          (s) =>
            `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px;width:100%;"><tr><td style="border-left:3px solid ${RED};padding:4px 0 4px 16px;">
              <div style="font-size:17px;font-weight:800;letter-spacing:-0.3px;color:${INK};">${escapeHtml(s.title)}</div>
              <div style="font-size:14px;font-weight:700;color:${INK};margin-top:3px;">${escapeHtml(s.when)}</div>
              ${s.location ? `<div style="font-size:13px;color:${MUTED};margin-top:2px;">${escapeHtml(s.location)}</div>` : ""}
            </td></tr></table>`
        )
        .join("");
      const isToday = p.lead === "today";
      return {
        subject: isToday
          ? `Today: your TEDxSavannah shift${shifts.length > 1 ? "s" : ""} 🎬`
          : `Coming up ${String(p.dayLabel)}: your TEDxSavannah shift${shifts.length > 1 ? "s" : ""}`,
        html: layout({
          eyebrow: EYEBROW[kind],
          preview: isToday ? "See you today — details inside." : "A heads-up about your upcoming shift.",
          bodyHtml:
            heading(isToday ? `Today's the day, ${name}!` : `See you soon, ${name}`) +
            paragraphs(
              isToday
                ? "Here's where you're needed today:"
                : `A quick heads-up — you're on the roster for ${String(p.dayLabel)}:`
            ) +
            list +
            paragraphs("Can't make it after all? Please tap below and cancel as early as you can so we can fill the spot."),
          ctaText: "View my shifts",
          ctaUrl: loginUrl,
        }),
      };
    }
    case "BROADCAST":
      return {
        subject: String(p.subject ?? "A message from TEDxSavannah"),
        html: layout({
          eyebrow: EYEBROW[kind],
          preview: String(p.subject ?? ""),
          bodyHtml:
            paragraphs(String(p.body ?? "")) +
            `<p style="margin:8px 0 0;color:#5a5a60;font-size:13px;">— ${escapeHtml(String(p.senderName ?? "TEDxSavannah"))}</p>`,
          ctaText: "Open the volunteer app",
          ctaUrl: loginUrl,
          footerNote: "Reply goes straight to the sender.",
        }),
      };
    case "SPOT_OPENED":
      return {
        subject: `A spot opened up: ${String(p.shiftTitle)}`,
        html: layout({
          eyebrow: EYEBROW[kind],
          preview: "You're on the waitlist — a spot just opened. First tap wins.",
          bodyHtml:
            heading(`Good news, ${name}!`) +
            paragraphs("A spot just opened on a shift you're waitlisted for:") +
            shiftDetails(p) +
            paragraphs("First come, first served — tap below to claim it."),
          ctaText: "Claim this spot",
          ctaUrl: loginUrl,
        }),
      };
    case "DIRECT_MESSAGE":
      return {
        subject: `New message from ${String(p.senderName ?? "TEDxSavannah")}`,
        html: layout({
          eyebrow: EYEBROW[kind],
          preview: String(p.body ?? "").slice(0, 90),
          bodyHtml:
            heading(`Hi ${name},`) +
            paragraphs(String(p.body ?? "")) +
            `<p style="margin:8px 0 0;color:#5a5a60;font-size:13px;">— ${escapeHtml(String(p.senderName ?? "TEDxSavannah"))}</p>`,
          ctaText: "Open the conversation",
          ctaUrl: loginUrl,
          footerNote:
            "Or just reply to this email — it goes straight into the conversation.",
        }),
      };
    case "THREAD_REPLY_NOTICE": {
      const preview = String(p.body ?? "");
      const short = preview.length > 300 ? `${preview.slice(0, 300)}…` : preview;
      return {
        subject: `${String(p.memberName)} sent you a message`,
        html: layout({
          eyebrow: EYEBROW[kind],
          preview: short.slice(0, 90),
          bodyHtml:
            heading(`${String(p.memberName)} wrote:`) +
            `<p style="margin:0 0 14px;padding:10px 14px;background:#fafafa;border-left:3px solid ${RED};color:${INK};white-space:pre-wrap;">${escapeHtml(short)}</p>`,
          ctaText: "Open the conversation",
          ctaUrl: loginUrl,
          footerNote: "You're receiving this because a volunteer wrote to you in the app.",
        }),
      };
    }
  }
}
