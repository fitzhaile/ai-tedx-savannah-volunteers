import { redirect } from "next/navigation";
import { getSessionUser, homeFor } from "@/lib/auth";
import { ButtonLink, Wordmark, Card } from "@/components/ui";

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <Wordmark />
        <ButtonLink href="/signin" variant="ghost" size="sm">
          Sign in
        </ButtonLink>
      </header>
      <main className="mx-auto max-w-4xl px-4 pt-10 pb-20 sm:pt-20">
        <p className="text-sm font-bold tracking-wide text-ted uppercase">
          TEDxSavannah · Saturday, May 15, 2027
        </p>
        <h1 className="mt-3 max-w-xl text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Be part of the big day.
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
          Volunteers make TEDxSavannah happen — registration desks, ushering, green
          rooms, stage crew, and speaker coaching nights in the months before. Pick
          the shifts that fit your life; we&apos;ll handle the rest.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/join" size="lg">
            Sign up to volunteer
          </ButtonLink>
          <ButtonLink href="/signin" variant="secondary" size="lg">
            I already have an account
          </ButtonLink>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-sm font-bold text-ink">Pick your own shifts</p>
            <p className="mt-1 text-sm text-ink-soft">
              See every open shift — date, time, place, and how many spots are left —
              and grab the ones you want.
            </p>
          </Card>
          <Card>
            <p className="text-sm font-bold text-ink">No passwords, ever</p>
            <p className="mt-1 text-sm text-ink-soft">
              Every email we send includes a one-tap button that signs you straight in.
            </p>
          </Card>
          <Card>
            <p className="text-sm font-bold text-ink">Plans change? No stress</p>
            <p className="mt-1 text-sm text-ink-soft">
              Cancel a shift in two taps. The earlier you do, the easier it is to fill
              your spot.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
