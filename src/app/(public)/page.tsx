import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, homeFor } from "@/lib/auth";
import { ButtonLink, Wordmark, Eyebrow } from "@/components/primitives";

// A real sequence — the order is the information.
const STEPS = [
  {
    title: "Join",
    body: "Your name and email. No password — every email we send signs you in with one tap.",
  },
  {
    title: "Pick your shifts",
    body: "Registration, ushering, green room, stage crew, speaker-coaching nights. Each one shows exactly how many spots are left.",
  },
  {
    title: "Show up",
    body: "We remind you three days before and the morning of. Plans change? Cancel in two taps so someone else can step in.",
  },
];

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));

  return (
    <div className="min-h-screen">
      <section className="bg-ink text-white">
        <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Wordmark inverse />
          <Link
            href="/signin"
            className="rounded-sm text-xs font-bold tracking-wide text-white/70 uppercase transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ted"
          >
            Sign in
          </Link>
        </header>
        <div className="mx-auto max-w-5xl px-4 pt-14 pb-20 sm:pt-24 sm:pb-28">
          <Eyebrow>Saturday, May 15, 2027 · Savannah, Georgia</Eyebrow>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.95] font-extrabold sm:text-7xl">
            Be part of
            <br />
            the big day<span className="text-ted">.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/70">
            Around 450 people will fill the theater for a day of ideas. About 35 volunteers
            make it run — at the doors, in the aisles, backstage, and at the speaker coaching
            nights in the months before. Pick the shifts that fit your life.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/join" size="lg">
              Sign up to volunteer
            </ButtonLink>
            <ButtonLink href="/signin" variant="inverse" size="lg">
              I already have an account
            </ButtonLink>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-16">
        <Eyebrow className="mb-6">How it works</Eyebrow>
        <ol className="grid gap-10 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-t-4 border-ink pt-4">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-ted font-display text-sm font-extrabold text-white">
                {i + 1}
              </span>
              <h2 className="mt-3 font-display text-xl font-bold text-foreground">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
        <footer className="mt-20 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
          <span>TEDxSavannah · This independent TEDx event is operated under license from TED.</span>
          <span>Questions? Reply to any of our emails.</span>
        </footer>
      </main>
    </div>
  );
}
