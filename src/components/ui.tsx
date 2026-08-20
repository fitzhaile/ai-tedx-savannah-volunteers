import { cn } from "@/lib/cn";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** Shared visual primitives. Server-safe (no hooks). */

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ted";

const buttonVariants = {
  primary: "bg-ted text-white hover:bg-ted-dark",
  secondary: "bg-card text-ink border border-line hover:border-ink-faint shadow-xs",
  ghost: "text-ink-soft hover:bg-line/60",
  danger: "bg-card text-ted border border-ted/40 hover:bg-ted-soft",
} as const;

const buttonSizes = {
  sm: "text-sm px-3 py-1.5",
  md: "text-sm px-4 py-2.5",
  lg: "text-base px-5 py-3",
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
    <div
      className={cn("rounded-xl border border-line bg-card p-5 shadow-xs", className)}
      {...props}
    />
  );
}

const badgeTones = {
  neutral: "bg-line/60 text-ink-soft",
  red: "bg-ted-soft text-ted-dark",
  green: "bg-go-soft text-go",
  amber: "bg-warn-soft text-warn",
  blue: "bg-info-soft text-info",
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        badgeTones[tone],
        className
      )}
      {...props}
    />
  );
}

const inputStyles =
  "w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-ted focus:outline-none focus:ring-2 focus:ring-ted/15";

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
    <label className={cn("mb-1.5 block text-sm font-semibold text-ink", className)} {...props} />
  );
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-ink-faint">{children}</p>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-soft">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-card/60 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-ink-soft">{title}</p>
      {hint ? <p className="mt-1 text-sm text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export function Wordmark({ sub = "Volunteers" }: { sub?: string }) {
  return (
    <span className="text-lg font-extrabold tracking-tight text-ink">
      TED<span className="text-ted">x</span>Savannah{" "}
      <span className="font-medium text-ink-soft">{sub}</span>
    </span>
  );
}
