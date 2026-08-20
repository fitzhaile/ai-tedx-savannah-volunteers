"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, normalizeEmail } from "@/lib/auth";
import { notifyWelcome, notifyMagicLink } from "@/lib/notify";

export interface AuthFormState {
  error?: string;
  sent?: boolean;
}

const joinSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().email("Please enter a valid email address").max(120),
  phone: z.string().trim().max(30).optional(),
});

/**
 * The open signup link. New email -> account + instant session (no
 * verification round-trip). Existing email -> magic link only, so nobody can
 * take over an account just by typing someone else's address.
 */
export async function joinAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = joinSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const email = normalizeEmail(parsed.data.email);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.isActive) await notifyMagicLink(existing);
    return { sent: true };
  }

  const user = await prisma.user.create({
    data: { email, name: parsed.data.name, phone: parsed.data.phone ?? null },
  });
  await createSession(user.id);
  await notifyWelcome(user);
  redirect("/shifts?welcome=1");
}

const signinSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(120),
});

export async function signinAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signinSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(parsed.data.email) },
  });
  if (user && user.isActive) await notifyMagicLink(user);
  // Same response either way — no account enumeration.
  return { sent: true };
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: z.string().trim().max(30).optional(),
});

export async function updateProfileAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const { requireUser } = await import("@/lib/auth");
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone ?? null },
  });
  return { sent: true };
}
