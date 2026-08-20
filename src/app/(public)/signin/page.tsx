import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, homeFor } from "@/lib/auth";
import { Card, Wordmark } from "@/components/ui";
import { SigninForm } from "@/components/client/SigninForm";

export const metadata = { title: "Sign in" };

export default async function SigninPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));
  const { expired } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pt-10">
      <div className="mb-6 text-center">
        <Link href="/">
          <Wordmark />
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-ink-soft">
          No passwords here — we&apos;ll email you a one-tap sign-in link.
        </p>
      </div>
      {expired ? (
        <div className="mb-4 rounded-xl bg-warn-soft p-3 text-sm font-semibold text-warn">
          That link expired or was already used. Request a fresh one below.
        </div>
      ) : null}
      <Card className="p-6">
        <SigninForm />
      </Card>
      <p className="mt-4 text-center text-sm text-ink-soft">
        New here?{" "}
        <Link href="/join" className="font-semibold text-ted hover:underline">
          Sign up to volunteer
        </Link>
      </p>
    </div>
  );
}
