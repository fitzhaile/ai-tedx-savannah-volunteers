/**
 * Extracts the human-written part of an email reply, stripping quoted
 * history and signatures. Pure function — unit-tested with real-world
 * fixtures (Gmail, Outlook, Apple Mail).
 */

const MAX_BODY = 10_000;

const CUT_PATTERNS: RegExp[] = [
  // Gmail / Apple Mail attribution, possibly wrapped across lines:
  // "On Tue, May 4, 2027 at 9:12 AM Fitz Haile <fitz@...> wrote:"
  /^On [\s\S]{0,300}?wrote:\s*$/m,
  // Outlook-style separators
  /^-{2,}\s*Original Message\s*-{2,}/im,
  /^_{10,}\s*$/m,
  // Outlook top-quote header block: "From: ..." shortly followed by Sent:/To:
  /^From:\s.+\r?\n(?:.+\r?\n){0,3}?(?:Sent|Date|To):\s/m,
  // Forwarded-message marker
  /^-{2,}\s*Forwarded message\s*-{2,}/im,
];

const SIGNATURE_DELIM = /^-- $/m;

function cutQuotedText(text: string): string {
  let cut = text.length;
  for (const re of CUT_PATTERNS) {
    const m = re.exec(text);
    if (m && m.index < cut) cut = m.index;
  }
  const sig = SIGNATURE_DELIM.exec(text);
  if (sig && sig.index < cut) cut = sig.index;
  return text.slice(0, cut);
}

function dropQuoteLines(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => !/^\s*>/.test(line))
    .join("\n");
}

function htmlToText(html: string): string {
  return (
    html
      // Drop quoted-history subtrees Gmail/others wrap in these containers.
      .replace(/<div[^>]*class="[^"]*gmail_quote[^"]*"[\s\S]*$/i, "")
      .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, "")
      .replace(/<(br|\/p|\/div|\/tr)[^>]*>/gi, "\n")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  );
}

export function extractReply(text: string | null, html: string | null): string {
  const source = text && text.trim() ? text : html ? htmlToText(html) : "";
  let out = cutQuotedText(source);
  out = dropQuoteLines(out);
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  if (!out) {
    // Everything looked like quoted text — keep the original rather than
    // losing the message entirely.
    out = (text ?? "").trim() || "(no text)";
  }
  return out.length > MAX_BODY ? `${out.slice(0, MAX_BODY)}…` : out;
}
