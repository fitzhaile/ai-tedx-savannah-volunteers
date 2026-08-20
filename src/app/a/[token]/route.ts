import { redirect } from "next/navigation";
import { verifyLoginToken } from "@/lib/tokens";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * One-click sign-in from email links (magic links and deep links).
 * Verifies the signed token and opens a normal session. This handler creates
 * a session but never changes app data — safe against email scanner prefetch.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const verified = await verifyLoginToken(token);
  if (!verified) redirect("/signin?expired=1");

  const user = await prisma.user.findUnique({ where: { id: verified.userId } });
  if (!user || !user.isActive) redirect("/signin?expired=1");

  await createSession(user.id);
  redirect(verified.redirect);
}
