import { cn } from "@/lib/cn";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Shared visual primitives — the TEDx editorial system: white paper, black
 * ink, the red. Display type carries hierarchy; boxes stay quiet.
 * Server-safe (no hooks).
 */

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold tracking-tight transition-all motion-reduce:transition-none disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ted active:scale-[0.98] motion-reduce:active:scale-100";

const buttonVariants = {
  primary: "bg-ted text-white hover:bg-ted-dark",
  secondary: "border-2 border-ink bg-transparent text-ink hover:bg-ink hover:text-white",
  ghost: "text-ink-soft hover:bg-ink/5 hover:text-ink",
  danger: "border-2 border-ted/60 bg-transparent text-ted hover:bg-ted hover:text-white",
  inverse: "border-2 border-white bg-transparent text-white hover:bg-white hover:text-ink",
} as const;

const buttonSizes = {
  sm: "text-sm px-3.5 py-1.5",
  md: "text-sm px-5 py-2.5",
  lg: "text-base px-7 py-3.5",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: keyof typeof buttonSizes = "md"
): string {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size]);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
}) {
  return <button className={cn(buttonStyles(variant, size), className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
}) {
  return <Link className={cn(buttonStyles(variant, size), className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("rounded-lg border border-line bg-card p-5", className)} {...props} />
  );
}

const badgeTones = {
  neutral: "bg-ink/[0.06] text-ink",
  red: "bg-ted text-white",
  green: "bg-go text-white",
  amber: "bg-warn text-white",
  blue: "bg-info text-white",
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-bold tracking-wide whitespace-nowrap uppercase",
        badgeTones[tone],
        className
      )}
      {...props}
    />
  );
}

const inputStyles =
  "w-full rounded-md border-2 border-line bg-card px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-ink focus:outline-none";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputStyles, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputStyles, "min-h-24", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputStyles, "appearance-auto", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label className={cn("mb-1.5 block text-sm font-bold text-ink", className)} {...props} />
  );
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">{children}</p>;
}

/** Red uppercase kicker line used above headlines. */
export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("eyebrow text-ted", className)} {...props} />;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-5">
      <div className="min-w-0">
        {eyebrow ? <Eyebrow className="mb-2">{eyebrow}</Eyebrow> : null}
        <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm text-ink-soft">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Section heading with the editorial top rule. */
export function SectionTitle({
  children,
  aside,
  className,
}: {
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-3 border-t-4 border-ink pt-3", className)}>
      <h2 className="font-display text-xl font-extrabold text-ink">{children}</h2>
      {aside}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border-t border-line px-2 py-10 text-center">
      <p className="font-display text-lg font-extrabold text-ink">{title}</p>
      {hint ? <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export function Wordmark({
  sub = "Volunteers",
  inverse = false,
}: {
  sub?: string;
  inverse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-2 font-display whitespace-nowrap",
        inverse ? "text-white" : "text-ink"
      )}
    >
      <span className="text-xl leading-tight font-extrabold tracking-tight">
        TED<span className="text-ted">x</span>Savannah
      </span>
      <span
        className={cn(
          // Body font here on purpose: the display face's optical sizing clips
          // cap tops at this size.
          "font-sans text-[11px] leading-none font-extrabold tracking-[0.18em] uppercase",
          inverse ? "text-white/60" : "text-ink-faint"
        )}
      >
        {sub}
      </span>
    </span>
  );
}
