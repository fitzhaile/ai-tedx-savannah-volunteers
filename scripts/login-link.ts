/**
 * Print a one-tap sign-in link for any user — handy in local development
 * where EMAIL_TRANSPORT=console means magic-link emails aren't delivered.
 *
 *   npm run login-link -- you@example.com
 *   npm run login-link -- you@example.com /admin
 *
 * Mirrors src/lib/tokens.ts (same AUTH_SECRET, same /a/<token> route).
 */
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

async function main() {
  const [email, redirect = "/"] = process.argv.slice(2);
  if (!email) {
    console.error("Usage: npm run login-link -- <email> [redirect path]");
    process.exit(1);
  }
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set (is .env present?)");

  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  await prisma.$disconnect();
  if (!user) throw new Error(`No user with email ${email}`);

  const token = await new SignJWT({ purpose: "login", redirect })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret));
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  console.log(`${base}/a/${token}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
