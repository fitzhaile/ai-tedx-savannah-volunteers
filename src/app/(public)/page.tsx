import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, homeFor } from "@/lib/auth";
import { ButtonLink, Wordmark, Eyebrow } from "@/components/ui";

const FEATURES = [
  {
    n: "01",
    title: "Pick your own shifts",
    body: "Every open shift with its date, time, place, and how many spots are left. Grab the ones that fit your life.",
  },
  {
    n: "02",
    title: "No passwords, ever",
    body: "Every email we send includes a one-tap button that signs you straight in. Nothing to remember.",
  },
  {
    n: "03",
    title: "Plans change? No stress",
    body: "Cancel a shift in two taps. The earlier you do, the easier it is for someone else to take your spot.",
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
            className="text-xs font-bold tracking-wide text-white/70 uppercase transition-colors hover:text-white"
          >
            Sign in
          </Link>
        </header>
        <div className="mx-auto max-w-5xl px-4 pt-14 pb-20 sm:pt-24 sm:pb-28">
          <Eyebrow>TEDxSavannah · Saturday, May 15, 2027</Eyebrow>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.95] font-extrabold sm:text-7xl">
            Be part of
            <br />
            the big day<span className="text-ted">.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/70">
            Volunteers make TEDxSavannah happen — registration desks, ushering, green
            rooms, stage crew, and speaker coaching nights in the months before. Pick
            the shifts that fit your life; we&apos;ll handle the rest.
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
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
          {FEATURES.map((f) => (
            <div key={f.n} className="border-t-4 border-ink pt-4">
              <p className="font-display text-3xl font-extrabold text-ted">{f.n}</p>
              <h2 className="mt-3 font-display text-xl font-extrabold text-ink">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.body}</p>
            </div>
          ))}
        </div>
        <footer className="mt-20 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-xs text-ink-faint">
          <span>TEDxSavannah · This independent TEDx event is operated under license from TED.</span>
          <span>Questions? Reply to any of our emails.</span>
        </footer>
      </main>
    </div>
  );
}
