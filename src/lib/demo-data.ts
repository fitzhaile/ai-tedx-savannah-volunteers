import {
  Role,
  ShiftCategory,
  SignupStatus,
  Canceller,
  type PrismaClient,
  type User,
  type StandardSlot,
  type Shift,
} from "@prisma/client";
import { fromZonedTime } from "date-fns-tz";

/**
 * Demo-season data, shared by `prisma/seed.ts` (CLI) and the time-travel
 * panel's "Load demo season" button (server action). Must stay importable
 * from plain Node — no "server-only", no "@/lib/db".
 *
 * Demo volunteers are plus-tagged on the manager's work address
 * (fitz+v1-nora-caldwell@fitzhaile.com); demo board members are plus-tagged
 * on the manager's sign-in email. Both deliver to the manager's own inboxes.
 */

const TZ = "America/New_York";

/** "you+tag@gmail.com" — Gmail delivers these to the manager's own inbox. */
export function plusAddress(managerEmail: string, tag: string): string {
  const [local, domain] = managerEmail.split("@");
  return `${local}+${tag}@${domain}`;
}

/** Local Savannah wall-clock time -> UTC Date. */
function et(year: number, month: number, day: number, hour: number, minute = 0): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  return fromZonedTime(`${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`, TZ);
}

export async function ensureManagerAndSettings(
  prisma: PrismaClient,
  managerEmail: string,
  managerName: string
): Promise<User> {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, replyToEmail: managerEmail, fromName: "TEDxSavannah Volunteers" },
  });
  return prisma.user.upsert({
    where: { email: managerEmail },
    update: { role: Role.MANAGER, isActive: true },
    create: { email: managerEmail, name: managerName, role: Role.MANAGER },
  });
}

/** Delete everything except the manager account and settings. */
export async function wipeAllButManager(prisma: PrismaClient, managerEmail: string): Promise<void> {
  await prisma.emailLog.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.signup.deleteMany({});
  await prisma.shift.deleteMany({});
  await prisma.standardSlot.deleteMany({});
  // Keep the manager signed in; everyone else's sessions go.
  await prisma.session.deleteMany({ where: { user: { email: { not: managerEmail } } } });
  await prisma.user.deleteMany({ where: { email: { not: managerEmail } } });
}

export interface DemoCounts {
  users: number;
  slots: number;
  shifts: number;
  signups: number;
}

/** Build the full demo season. Assumes a prior wipe (or a fresh database). */
export async function seedDemoSeason(
  prisma: PrismaClient,
  managerEmail: string
): Promise<DemoCounts> {
  const manager = await prisma.user.findUnique({ where: { email: managerEmail } });
  if (!manager) throw new Error(`Manager account ${managerEmail} not found`);

  // --- Board members ------------------------------------------------------
  const sarah = await prisma.user.create({
    data: {
      email: plusAddress(managerEmail, "sarah"),
      name: "Sarah Chen",
      role: Role.BOARD,
      phone: "912-555-0142",
    },
  });
  const marcus = await prisma.user.create({
    data: {
      email: plusAddress(managerEmail, "marcus"),
      name: "Marcus Webb",
      role: Role.BOARD,
      phone: "912-555-0177",
    },
  });

  // --- Volunteers ---------------------------------------------------------
  // Demo volunteers get plus-tagged addresses on the manager's work account
  // (fitz+v3-tessa-okafor@fitzhaile.com), so every email the app sends them
  // lands in the manager's work inbox, labeled by who it was "for".
  const VOLUNTEER_EMAIL_BASE = "fitz@fitzhaile.com";
  const volunteerNames = [
    "Nora Caldwell", "Miles Bergstrom", "Tessa Okafor", "Julian Reyes", "Harper Nguyen",
    "Desmond Clarke", "Ivy Marchetti", "Silas Boone", "Camille Duplessis", "Theo Lindqvist",
    "Renata Vasquez", "Oscar Whitfield", "Daphne Kimura", "Grant Abernathy", "Lucia Moreau",
  ];
  const volunteers: User[] = [];
  for (let i = 0; i < volunteerNames.length; i++) {
    const nameSlug = volunteerNames[i].toLowerCase().replace(/\s+/g, "-");
    volunteers.push(
      await prisma.user.create({
        data: {
          email: plusAddress(VOLUNTEER_EMAIL_BASE, `v${i + 1}-${nameSlug}`),
          name: volunteerNames[i],
          phone: `912-555-0${String(200 + i)}`,
        },
      })
    );
  }

  // --- Standard slots (the three days around the event) -------------------
  const slotDefs = [
    { label: "Thu May 13 — Morning", startsAt: et(2027, 5, 13, 9), endsAt: et(2027, 5, 13, 12) },
    { label: "Thu May 13 — Afternoon", startsAt: et(2027, 5, 13, 13), endsAt: et(2027, 5, 13, 17) },
    { label: "Fri May 14 — Morning", startsAt: et(2027, 5, 14, 9), endsAt: et(2027, 5, 14, 12) },
    { label: "Fri May 14 — Afternoon", startsAt: et(2027, 5, 14, 13), endsAt: et(2027, 5, 14, 17) },
    { label: "Sat May 15 — Early (Event Day)", startsAt: et(2027, 5, 15, 7), endsAt: et(2027, 5, 15, 10, 30) },
    { label: "Sat May 15 — Midday (Event Day)", startsAt: et(2027, 5, 15, 10, 30), endsAt: et(2027, 5, 15, 14) },
    { label: "Sat May 15 — Afternoon (Event Day)", startsAt: et(2027, 5, 15, 14), endsAt: et(2027, 5, 15, 18) },
  ];
  const slots: StandardSlot[] = [];
  for (let i = 0; i < slotDefs.length; i++) {
    slots.push(await prisma.standardSlot.create({ data: { ...slotDefs[i], sortOrder: i } }));
  }
  const slotByLabel = (label: string) => {
    const s = slots.find((s) => s.label === label);
    if (!s) throw new Error(`missing slot ${label}`);
    return s;
  };

  // --- Event & general shifts --------------------------------------------
  const theater = "Trustees Theater, 216 E Broughton St";
  const mkShift = (data: {
    title: string;
    slotLabel?: string;
    startsAt?: Date;
    endsAt?: Date;
    capacity: number;
    category?: ShiftCategory;
    location?: string;
    description?: string;
    ownerId?: string;
  }): Promise<Shift> => {
    const slot = data.slotLabel ? slotByLabel(data.slotLabel) : null;
    return prisma.shift.create({
      data: {
        title: data.title,
        category: data.category ?? ShiftCategory.EVENT,
        slotId: slot?.id ?? null,
        startsAt: slot?.startsAt ?? data.startsAt!,
        endsAt: slot?.endsAt ?? data.endsAt!,
        capacity: data.capacity,
        location: data.location ?? theater,
        description: data.description,
        ownerId: data.ownerId ?? null,
        createdById: manager.id,
      },
    });
  };

  const swagBags = await mkShift({
    title: "Swag Bag Stuffing", slotLabel: "Thu May 13 — Morning", capacity: 6,
    location: "TEDx storage, 2315 Bull St",
    description: "Assemble 450 attendee bags. Casual, music on, lots of chatting.",
  });
  const venueSetup = await mkShift({
    title: "Venue Setup", slotLabel: "Thu May 13 — Afternoon", capacity: 8, ownerId: marcus.id,
    description: "Load-in, signage staging, sponsor tables. Comfortable shoes!",
  });
  const rehearsalRunner = await mkShift({
    title: "Rehearsal Runner", slotLabel: "Fri May 14 — Morning", capacity: 3, ownerId: sarah.id,
    description: "Support speakers during tech rehearsal — timing cards, water, errands.",
  });
  const signage = await mkShift({
    title: "Signage & Wayfinding", slotLabel: "Fri May 14 — Afternoon", capacity: 4, ownerId: marcus.id,
    description: "Hang directional signage and set the registration area.",
  });
  // Ad-hoc shift outside the standard slots (the special-occasion escape hatch)
  const speakerDinner = await mkShift({
    title: "Speaker Dinner Support", capacity: 2, category: ShiftCategory.GENERAL,
    startsAt: et(2027, 5, 14, 18), endsAt: et(2027, 5, 14, 21),
    location: "The Grey, 109 Martin Luther King Jr Blvd",
    description: "Greet speakers and help the host with seating. Ad-hoc time by special arrangement.",
  });
  const registration = await mkShift({
    title: "Registration Desk", slotLabel: "Sat May 15 — Early (Event Day)", capacity: 6,
    description: "Check in 450 attendees. High energy, first faces of TEDx!",
  });
  const greenRoom = await mkShift({
    title: "Green Room Support", slotLabel: "Sat May 15 — Early (Event Day)", capacity: 2, ownerId: sarah.id,
    description: "Keep speakers calm, caffeinated, and on schedule.",
  });
  const ushers = await mkShift({
    title: "Ushers", slotLabel: "Sat May 15 — Midday (Event Day)", capacity: 8,
    description: "Guide seating between sessions, manage doors during talks.",
  });
  const stageCrew = await mkShift({
    title: "Stage Crew", slotLabel: "Sat May 15 — Midday (Event Day)", capacity: 4, ownerId: marcus.id,
    description: "Prop transitions and stage resets between talks.",
  });
  const vipReception = await mkShift({
    title: "VIP Reception", slotLabel: "Sat May 15 — Afternoon (Event Day)", capacity: 3,
    description: "Host the speaker & sponsor reception after the final session.",
  });
  const breakdown = await mkShift({
    title: "Breakdown Crew", slotLabel: "Sat May 15 — Afternoon (Event Day)", capacity: 6, ownerId: marcus.id,
    description: "Load-out and venue reset. Pizza provided.",
  });

  // --- Coaching sessions (biweekly Tuesdays, two per day, 2 volunteers each)
  const coachingDays: [number, number][] = [[3, 9], [3, 23], [4, 6], [4, 20]];
  const coachingShifts: Shift[] = [];
  for (const [month, day] of coachingDays) {
    coachingShifts.push(
      await mkShift({
        title: "Speaker Coaching — Early Session", category: ShiftCategory.COACHING,
        startsAt: et(2027, month, day, 17, 30), endsAt: et(2027, month, day, 18, 30),
        capacity: 2, ownerId: sarah.id, location: "Bull Street Labs, 2222 Bull St",
        description: "Run the timer, read audience reactions, give the speaker a friendly face.",
      }),
      await mkShift({
        title: "Speaker Coaching — Late Session", category: ShiftCategory.COACHING,
        startsAt: et(2027, month, day, 18, 45), endsAt: et(2027, month, day, 19, 45),
        capacity: 2, ownerId: sarah.id, location: "Bull Street Labs, 2222 Bull St",
        description: "Run the timer, read audience reactions, give the speaker a friendly face.",
      })
    );
  }

  // --- Signups ------------------------------------------------------------
  const signup = (shiftId: string, userIdx: number, status: SignupStatus = SignupStatus.CONFIRMED) =>
    prisma.signup.create({ data: { shiftId, userId: volunteers[userIdx].id, status } });

  // Green Room: full, with a waitlist
  await signup(greenRoom.id, 0);
  await signup(greenRoom.id, 1);
  await signup(greenRoom.id, 2, SignupStatus.WAITLISTED);
  await signup(greenRoom.id, 3, SignupStatus.WAITLISTED);

  // Registration: 4 of 6
  for (const i of [4, 5, 6, 7]) await signup(registration.id, i);
  // Ushers: 5 of 8
  for (const i of [8, 9, 10, 11, 12]) await signup(ushers.id, i);
  // Stage crew: 2 of 4
  for (const i of [13, 14]) await signup(stageCrew.id, i);
  // Setup days partially filled
  for (const i of [0, 4, 8]) await signup(swagBags.id, i);
  for (const i of [1, 5, 9, 13]) await signup(venueSetup.id, i);
  for (const i of [2, 6]) await signup(rehearsalRunner.id, i);
  for (const i of [3, 7]) await signup(signage.id, i);
  await signup(speakerDinner.id, 10);
  for (const i of [11, 12]) await signup(vipReception.id, i);
  for (const i of [0, 1, 2]) await signup(breakdown.id, i);

  // Coaching: first two days staffed, third partial, fourth empty
  await signup(coachingShifts[0].id, 0);
  await signup(coachingShifts[0].id, 5);
  await signup(coachingShifts[1].id, 6);
  await signup(coachingShifts[1].id, 10);
  await signup(coachingShifts[2].id, 0);
  await signup(coachingShifts[2].id, 7);
  await signup(coachingShifts[3].id, 5);
  await signup(coachingShifts[3].id, 12);
  await signup(coachingShifts[4].id, 6);

  // A couple of realistic cancellations for the dashboard feed
  await prisma.signup.create({
    data: {
      shiftId: ushers.id, userId: volunteers[3].id, status: SignupStatus.CANCELLED,
      cancelledAt: new Date(), cancelledBy: Canceller.SELF,
      cancelNote: "So sorry — my kid's soccer tournament got moved to that Saturday.",
    },
  });
  await prisma.signup.create({
    data: {
      shiftId: registration.id, userId: volunteers[14].id, status: SignupStatus.CANCELLED,
      cancelledAt: new Date(), cancelledBy: Canceller.SELF,
      cancelNote: "Double-booked myself, can still do an afternoon shift if that helps!",
    },
  });

  return {
    users: await prisma.user.count(),
    slots: await prisma.standardSlot.count(),
    shifts: await prisma.shift.count(),
    signups: await prisma.signup.count(),
  };
}
