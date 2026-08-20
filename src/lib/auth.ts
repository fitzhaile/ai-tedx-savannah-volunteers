import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

const COOKIE_NAME = "tedx_session";
const SESSION_DAYS = 60;

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  jar.delete(COOKIE_NAME);
}

/** The signed-in, active user for this request — or null. Cached per request. */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  // Touch lastSeenAt at most once an hour to avoid a write on every request.
  if (Date.now() - session.lastUsedAt.getTime() > 60 * 60 * 1000) {
    await Promise.all([
      prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } }),
      prisma.user.update({ where: { id: session.userId }, data: { lastSeenAt: new Date() } }),
    ]);
  }
  return session.user;
});

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/signin");
  return user;
}

export async function requireBoard(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "BOARD" && user.role !== "MANAGER") redirect("/shifts");
  return user;
}

export async function requireManager(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "MANAGER") redirect("/shifts");
  return user;
}

export function homeFor(user: User | null): string {
  if (!user) return "/";
  if (user.role === "MANAGER") return "/admin";
  if (user.role === "BOARD") return "/board";
  return "/shifts";
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
