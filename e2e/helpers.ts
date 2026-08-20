import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { loadDotEnv } from "../src/test/env";

loadDotEnv();

export const prisma = new PrismaClient();

/** Same shape as src/lib/tokens.ts loginLink — minted directly for tests. */
export async function loginUrl(userId: string, redirect = "/shifts"): Promise<string> {
  const token = await new SignJWT({ purpose: "login", redirect })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
  return `${base}/a/${token}`;
}
