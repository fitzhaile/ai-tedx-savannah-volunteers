import type { EmailKind } from "@prisma/client";
import type { EmailParams } from "@/lib/email/templates";

/**
 * Representative params for every email kind — used by the "email me one of
 * each template" tool so the manager can see real renders in a real inbox.
 * Names are fictional; places are the demo season's.
 */
const shift = {
  shiftTitle: "Registration Desk",
  when: "Sat, May 15 · 7:00–10:30 AM",
  whenShort: "Sat, May 15, 2027",
  location: "Trustees Theater, 216 E Broughton St",
};

export const SAMPLE_EMAILS: { kind: EmailKind; linkPath: string; params: EmailParams }[] = [
  { kind: "MAGIC_LINK", linkPath: "/", params: { name: "Daphne" } },
  { kind: "WELCOME", linkPath: "/shifts", params: { name: "Daphne" } },
  { kind: "BOARD_INVITE", linkPath: "/board", params: { name: "Sarah", inviterName: "Fitz Haile" } },
  { kind: "SIGNUP_CONFIRM", linkPath: "/me", params: { name: "Daphne", ...shift } },
  { kind: "CANCEL_CONFIRM", linkPath: "/shifts", params: { name: "Daphne", ...shift } },
  {
    kind: "CANCEL_ALERT",
    linkPath: "/admin",
    params: {
      volunteerName: "Daphne Kimura",
      note: "So sorry — jury duty came up that week!",
      spotsFilled: 3,
      capacity: 6,
      waitlistCount: 1,
      ...shift,
    },
  },
  {
    kind: "REMOVED_NOTICE",
    linkPath: "/shifts",
    params: { name: "Daphne", note: "We moved you to the afternoon shift instead — see you then!", ...shift },
  },
  {
    kind: "REMINDER",
    linkPath: "/me",
    params: {
      name: "Daphne",
      lead: "t3",
      dayLabel: "Saturday, May 15",
      shifts: [
        { title: "Registration Desk", when: "Sat, May 15 · 7:00–10:30 AM", location: "Trustees Theater" },
        { title: "Ushers", when: "Sat, May 15 · 10:30 AM–2:00 PM", location: "Trustees Theater" },
      ],
    },
  },
  {
    kind: "BROADCAST",
    linkPath: "/me",
    params: {
      name: "Daphne",
      subject: "Parking info for Saturday",
      body: "Hi all,\n\nPark in the Liberty Street garage — bring your ticket inside and we'll validate it.\n\nSee you at 7!",
      senderName: "Fitz Haile",
    },
  },
  { kind: "SPOT_OPENED", linkPath: "/shifts", params: { name: "Tessa", ...shift } },
  {
    kind: "DIRECT_MESSAGE",
    linkPath: "/me/messages",
    params: {
      name: "Daphne",
      senderName: "Fitz Haile",
      body: "Hi Daphne — can you take Saturday morning at registration? It's the fun one.",
    },
  },
  {
    kind: "THREAD_REPLY_NOTICE",
    linkPath: "/admin/volunteers",
    params: { memberName: "Daphne Kimura", body: "Yes! Sign me up. Do I need to bring anything?" },
  },
];
