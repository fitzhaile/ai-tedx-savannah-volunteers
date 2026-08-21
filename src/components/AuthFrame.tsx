import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark, Eyebrow } from "@/components/ui";

/** Split layout for /join and /signin: black brand panel + the form. */
export function AuthFrame({
  title,
  subtitle,
  children,
  footer,
  banner,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  banner?: ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[5fr_7fr]">
      <aside className="bg-ink px-6 py-8 text-white lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10">
        <Link href="/">
          <Wordmark inverse />
        </Link>
        <div className="mt-10 lg:mt-0">
          <Eyebrow>Saturday, May 15, 2027</Eyebrow>
          <p className="mt-3 max-w-sm font-display text-3xl leading-[1.05] font-extrabold lg:text-5xl">
            Ideas worth spreading need people worth counting on<span className="text-ted">.</span>
          </p>
        </div>
        <p className="mt-10 hidden text-xs text-white/50 lg:block">
          TEDxSavannah · Independently organized TED event
        </p>
      </aside>
      <main className="mx-auto w-full max-w-md px-6 py-10 lg:max-w-lg lg:self-center lg:px-12">
        <h1 className="font-display text-3xl font-extrabold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>
        {banner ? <div className="mt-5">{banner}</div> : null}
        <div className="mt-7">{children}</div>
        <p className="mt-6 text-sm text-ink-soft">{footer}</p>
      </main>
    </div>
  );
}
