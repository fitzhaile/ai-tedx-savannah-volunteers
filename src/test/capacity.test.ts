import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { transactionalSignup } from "@/lib/signup-core";

const future = (h: number) => new Date(Date.now() + h * 3600_000);
const ids: { users: string[]; shifts: string[] } = { users: [], shifts: [] };

async function mkUser(tag: string) {
  const u = await prisma.user.create({
    data: { email: `test-${tag}-${Date.now()}@example.test`, name: `Test ${tag}` },
  });
  ids.users.push(u.id);
  return u;
}

async function mkShift(capacity: number, opts: { past?: boolean } = {}) {
  const s = await prisma.shift.create({
    data: {
      title: `Test shift ${Date.now()}`,
      capacity,
      startsAt: opts.past ? new Date(Date.now() - 7200_000) : future(24),
      endsAt: opts.past ? new Date(Date.now() - 3600_000) : future(28),
    },
  });
  ids.shifts.push(s.id);
  return s;
}

describe("transactionalSignup", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.signup.deleteMany({ where: { shiftId: { in: ids.shifts } } });
    await prisma.shift.deleteMany({ where: { id: { in: ids.shifts } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.$disconnect();
  });

  it("gives the last spot to exactly one of two racing volunteers", async () => {
    const shift = await mkShift(1);
    const [a, b] = await Promise.all([mkUser("a"), mkUser("b")]);
    const nowDate = new Date();

    const [ra, rb] = await Promise.all([
      transactionalSignup(shift.id, a.id, false, nowDate),
      transactionalSignup(shift.id, b.id, false, nowDate),
    ]);

    const outcomes = [ra, rb].map((r) => (r.ok ? r.status : r.reason)).sort();
    expect(outcomes).toEqual(["confirmed", "full"]);

    const confirmed = await prisma.signup.count({
      where: { shiftId: shift.id, status: "CONFIRMED" },
    });
    expect(confirmed).toBe(1);
  });

  it("waitlists when full and allowWaitlist is set", async () => {
    const shift = await mkShift(1);
    const [a, b] = await Promise.all([mkUser("w1"), mkUser("w2")]);
    const nowDate = new Date();

    const first = await transactionalSignup(shift.id, a.id, true, nowDate);
    const second = await transactionalSignup(shift.id, b.id, true, nowDate);
    expect(first).toEqual({ ok: true, status: "confirmed" });
    expect(second).toEqual({ ok: true, status: "waitlisted" });
  });

  it("re-signup after cancel reuses the row", async () => {
    const shift = await mkShift(2);
    const u = await mkUser("re");
    const nowDate = new Date();

    await transactionalSignup(shift.id, u.id, false, nowDate);
    await prisma.signup.update({
      where: { shiftId_userId: { shiftId: shift.id, userId: u.id } },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelledBy: "SELF" },
    });
    const again = await transactionalSignup(shift.id, u.id, false, nowDate);
    expect(again).toEqual({ ok: true, status: "confirmed" });

    const rows = await prisma.signup.findMany({
      where: { shiftId: shift.id, userId: u.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("CONFIRMED");
    expect(rows[0].cancelledAt).toBeNull();
  });

  it("rejects signup for ended shifts and unpublished shifts", async () => {
    const past = await mkShift(3, { past: true });
    const hidden = await mkShift(3);
    await prisma.shift.update({ where: { id: hidden.id }, data: { isPublished: false } });
    const u = await mkUser("p");
    const nowDate = new Date();

    expect(await transactionalSignup(past.id, u.id, false, nowDate)).toEqual({
      ok: false,
      reason: "past",
    });
    expect(await transactionalSignup(hidden.id, u.id, false, nowDate)).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });
});
