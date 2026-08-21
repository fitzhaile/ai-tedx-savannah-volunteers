import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, homeFor } from "@/lib/auth";
import { AuthFrame } from "@/components/AuthFrame";
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
    <AuthFrame
      title="Sign in"
      subtitle="No passwords here — we'll email you a one-tap sign-in link."
      banner={
        expired ? (
          <div className="border-l-4 border-warn bg-warn-soft px-4 py-3 text-sm font-semibold text-warn">
            That link expired or was already used. Request a fresh one below.
          </div>
        ) : null
      }
      footer={
        <>
          New here?{" "}
          <Link href="/join" className="font-bold text-ted hover:underline">
            Sign up to volunteer
          </Link>
        </>
      }
    >
      <SigninForm />
    </AuthFrame>
  );
}
