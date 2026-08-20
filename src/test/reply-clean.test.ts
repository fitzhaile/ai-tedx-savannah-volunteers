import { describe, it, expect } from "vitest";
import { extractReply } from "@/lib/email/reply-clean";

describe("extractReply", () => {
  it("cuts Gmail-style quoted history", () => {
    const text = `Count me in for Saturday!\n\nOn Tue, May 4, 2027 at 9:12 AM TEDxSavannah Volunteers <fitz@fitzhaile.com> wrote:\n> Hi Daphne,\n> Are you free?`;
    expect(extractReply(text, null)).toBe("Count me in for Saturday!");
  });

  it("cuts a wrapped attribution line", () => {
    const text = `Yes!\n\nOn Tue, May 4, 2027 at 9:12 AM TEDxSavannah Volunteers <\nfitz@fitzhaile.com> wrote:\n\n> details`;
    expect(extractReply(text, null)).toBe("Yes!");
  });

  it("cuts Outlook original-message blocks", () => {
    const text = `Sounds good.\n\n-----Original Message-----\nFrom: Fitz\nSent: Tuesday\nSubject: Shift`;
    expect(extractReply(text, null)).toBe("Sounds good.");
  });

  it("cuts Outlook top-quote From/Sent header blocks", () => {
    const text = `Will do.\n\nFrom: Fitz Haile <fitz@fitzhaile.com>\nSent: Tuesday, May 4, 2027\nTo: Daphne\nSubject: Re: Shift`;
    expect(extractReply(text, null)).toBe("Will do.");
  });

  it("drops bare quoted lines and signatures", () => {
    const text = `Sure thing.\n> what about the morning?\n> anyone available?\n-- \nDaphne Kimura\nSent from my phone`;
    expect(extractReply(text, null)).toBe("Sure thing.");
  });

  it("falls back to html when text is empty, stripping gmail_quote", () => {
    const html = `<div dir="ltr">I can take the late session.</div><div class="gmail_quote"><blockquote>old stuff</blockquote></div>`;
    expect(extractReply(null, html)).toBe("I can take the late session.");
  });

  it("keeps the original when everything looks quoted", () => {
    const text = `> just quoted text\n> nothing new`;
    expect(extractReply(text, null)).toBe(text.trim());
  });

  it("caps very long bodies", () => {
    const text = "a".repeat(12_000);
    expect(extractReply(text, null).length).toBeLessThanOrEqual(10_001);
  });
});
