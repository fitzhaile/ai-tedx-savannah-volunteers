import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, homeFor } from "@/lib/auth";
import { Card, Wordmark } from "@/components/ui";
import { JoinForm } from "@/components/client/JoinForm";

export const metadata = { title: "Volunteer sign-up" };

export default async function JoinPage() {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pt-10">
      <div className="mb-6 text-center">
        <Link href="/">
          <Wordmark />
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
          Join the volunteer crew
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Takes 30 seconds — then you can grab shifts right away.
        </p>
      </div>
      <Card className="p-6">
        <JoinForm />
      </Card>
      <p className="mt-4 text-center text-sm text-ink-soft">
        Already registered?{" "}
        <Link href="/signin" className="font-semibold text-ted hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
