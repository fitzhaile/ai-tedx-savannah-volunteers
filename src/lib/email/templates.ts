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

const RED = "#EB0028";
const INK = "#1a1a1a";

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
        `<p style="margin:0 0 14px;line-height:1.6;color:${INK};">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`
    )
    .join("");
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:4px 12px 4px 0;color:#777;font-size:14px;white-space:nowrap;vertical-align:top;">${label}</td>
    <td style="padding:4px 0;color:${INK};font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
  </tr>`;
}

function shiftDetails(p: EmailParams): string {
  const rows = [
    p.shiftTitle ? detailRow("Shift", String(p.shiftTitle)) : "",
    p.when ? detailRow("When", String(p.when)) : "",
    p.location ? detailRow("Where", String(p.location)) : "",
  ].join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 16px;background:#fafafa;border:1px solid #eee;border-radius:8px;padding:8px;width:100%;"><tbody>${rows}</tbody></table>`;
}

function layout(opts: {
  preview: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
}): string {
  const cta =
    opts.ctaText && opts.ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;"><tr><td style="border-radius:8px;background:${RED};">
           <a href="${opts.ctaUrl}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">${escapeHtml(opts.ctaText)}</a>
         </td></tr></table>`
      : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f2f2f2;font-family:Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(opts.preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
      <tr><td style="padding:0 4px 12px;">
        <span style="font-size:18px;font-weight:800;color:${INK};letter-spacing:-0.3px;">TED<span style="color:${RED};">x</span>Savannah <span style="font-weight:500;color:#666;">Volunteers</span></span>
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e8e8e8;">
        ${opts.bodyHtml}
        ${cta}
      </td></tr>
      <tr><td style="padding:14px 8px;color:#888;font-size:12px;line-height:1.6;">
        ${opts.footerNote ?? "Questions? Just reply to this email — it goes straight to the volunteer manager."}
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:20px;line-height:1.35;color:${INK};">${escapeHtml(text)}</h1>`;
}

export function buildEmail(kind: EmailKind, p: EmailParams, loginUrl: string): RenderedEmail {
  const name = String(p.name ?? "there");
  switch (kind) {
    case "MAGIC_LINK":
      return {
        subject: "Your TEDxSavannah sign-in link",
        html: layout({
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
            `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 10px;background:#fafafa;border:1px solid #eee;border-radius:8px;padding:10px 14px;width:100%;"><tr><td>
              <div style="font-weight:700;color:${INK};font-size:15px;">${escapeHtml(s.title)}</div>
              <div style="color:#555;font-size:14px;margin-top:2px;">${escapeHtml(s.when)}</div>
              ${s.location ? `<div style="color:#777;font-size:13px;margin-top:2px;">${escapeHtml(s.location)}</div>` : ""}
            </td></tr></table>`
        )
        .join("");
      const isToday = p.lead === "today";
      return {
        subject: isToday
          ? `Today: your TEDxSavannah shift${shifts.length > 1 ? "s" : ""} 🎬`
          : `Coming up ${String(p.dayLabel)}: your TEDxSavannah shift${shifts.length > 1 ? "s" : ""}`,
        html: layout({
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
          preview: String(p.subject ?? ""),
          bodyHtml:
            paragraphs(String(p.body ?? "")) +
            `<p style="margin:8px 0 0;color:#777;font-size:13px;">— ${escapeHtml(String(p.senderName ?? "TEDxSavannah"))}</p>`,
          ctaText: "Open the volunteer app",
          ctaUrl: loginUrl,
          footerNote: "Reply goes straight to the sender.",
        }),
      };
    case "SPOT_OPENED":
      return {
        subject: `A spot opened up: ${String(p.shiftTitle)}`,
        html: layout({
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
  }
}
