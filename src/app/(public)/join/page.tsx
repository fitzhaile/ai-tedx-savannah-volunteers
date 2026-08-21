import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, homeFor } from "@/lib/auth";
import { AuthFrame } from "@/components/AuthFrame";
import { JoinForm } from "@/components/client/JoinForm";

export const metadata = { title: "Volunteer sign-up" };

export default async function JoinPage() {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));

  return (
    <AuthFrame
      title="Join the volunteer crew"
      subtitle="Takes 30 seconds — then you can grab shifts right away."
      footer={
        <>
          Already registered?{" "}
          <Link href="/signin" className="font-bold text-ted hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <JoinForm />
    </AuthFrame>
  );
}
