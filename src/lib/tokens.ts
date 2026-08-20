import { SignJWT, jwtVerify } from "jose";

/**
 * Stateless signed login tokens power both magic links (/signin emails,
 * 15 minutes) and the one-click deep links in every other email (14 days).
 * Visiting /a/<token> verifies the signature and opens a normal session.
 */

const PURPOSE = "login";

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function createLoginToken(
  userId: string,
  opts: { expiresIn: string; redirect?: string }
): Promise<string> {
  return new SignJWT({ purpose: PURPOSE, redirect: opts.redirect ?? "/" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn)
    .sign(secret());
}

export async function verifyLoginToken(
  token: string
): Promise<{ userId: string; redirect: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== PURPOSE || typeof payload.sub !== "string") return null;
    const redirect = typeof payload.redirect === "string" ? payload.redirect : "/";
    // Only allow same-app relative redirects.
    const safe = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
    return { userId: payload.sub, redirect: safe };
  } catch {
    return null;
  }
}

export function appUrl(path = "/"): string {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

/** A signed sign-in URL that lands the user on `redirect`, already authenticated. */
export async function loginLink(
  userId: string,
  redirect: string,
  expiresIn = "14d"
): Promise<string> {
  const token = await createLoginToken(userId, { expiresIn, redirect });
  return appUrl(`/a/${token}`);
}
