import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button as ShButton } from "@/components/ui/button";
import { Badge as ShBadge } from "@/components/ui/badge";
import { Card as ShCard } from "@/components/ui/card";
import { Input as ShInput } from "@/components/ui/input";
import { Textarea as ShTextarea } from "@/components/ui/textarea";
import { Label as ShLabel } from "@/components/ui/label";

/**
 * The app's component vocabulary, built on shadcn/ui (src/components/ui).
 * Pages import from here so the brand mapping lives in one place.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "inverse" | "link";
type ButtonSize = "sm" | "md" | "lg";

const variantMap = {
  primary: { variant: "default", className: "font-semibold" },
  // Light fill + visible border so it reads as a button on white, without
  // competing with the red primary (shadcn's bare outline hid against cards).
  secondary: {
    variant: "outline",
    className:
      "border-foreground/20 bg-muted font-semibold hover:border-foreground/30 hover:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_6%)]",
  },
  ghost: { variant: "ghost", className: "font-semibold" },
  danger: { variant: "destructive", className: "font-semibold" },
  /** Inline text action (no box). */
  link: { variant: "link", className: "h-auto px-0 font-semibold" },
  inverse: {
    variant: "outline",
    className:
      "border-white/40 bg-transparent font-semibold text-white hover:border-white hover:bg-white hover:text-foreground",
  },
} as const;

const sizeMap = {
  sm: { size: "sm", className: "" },
  md: { size: "default", className: "h-9 px-4" },
  lg: { size: "lg", className: "h-11 px-6 text-base" },
} as const;

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  const v = variantMap[variant];
  const s = sizeMap[size];
  return (
    <ShButton
      variant={v.variant}
      size={s.size}
      className={cn(v.className, s.className, className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  const v = variantMap[variant];
  const s = sizeMap[size];
  return (
    <ShButton asChild variant={v.variant} size={s.size} className={cn(v.className, s.className, className)}>
      <Link {...props} />
    </ShButton>
  );
}

/** A padded surface. For structured cards use CardHeader/CardContent from ui/card. */
export function Card({ className, ...props }: ComponentProps<"div">) {
  // shadcn's Card is a column flexbox; neutralize that so callers can lay out
  // rows with plain `flex items-center …` classes.
  return <ShCard className={cn("block flex-row gap-0 p-5", className)} {...props} />;
}

const badgeTones = {
  neutral: { variant: "secondary", className: "" },
  red: { variant: "default", className: "bg-ted text-white" },
  green: { variant: "default", className: "bg-go text-white" },
  amber: { variant: "default", className: "bg-warn text-white" },
  blue: { variant: "default", className: "bg-info text-white" },
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: keyof typeof badgeTones }) {
  const t = badgeTones[tone];
  return <ShBadge variant={t.variant} className={cn("font-semibold", t.className, className)} {...props} />;
}

export function Input(props: ComponentProps<"input">) {
  return <ShInput {...props} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <ShTextarea {...props} />;
}

/** Native select (submits with forms; no Radix portal). Styled to match Input. */
export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <ShLabel className={cn("mb-1.5", className)} {...props} />;
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{children}</p>;
}

/** Red uppercase kicker line. */
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <Eyebrow className="mb-1.5">{eyebrow}</Eyebrow> : null}
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

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
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <h2 className="font-display text-lg font-bold text-foreground">{children}</h2>
      {aside}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed px-6 py-10 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {hint ? <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p> : null}
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
        inverse ? "text-white" : "text-foreground"
      )}
    >
      <span className="text-xl leading-tight font-extrabold tracking-tight">
        TED<span className="text-ted">x</span>Savannah
      </span>
      <span
        className={cn(
          "font-sans text-[11px] leading-none font-bold tracking-[0.18em] uppercase",
          inverse ? "text-white/60" : "text-muted-foreground"
        )}
      >
        {sub}
      </span>
    </span>
  );
}
