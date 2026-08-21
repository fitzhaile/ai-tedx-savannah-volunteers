"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/** Primary nav inside the black masthead: underline tabs, red for active. */
export function NavLinks({
  links,
}: {
  links: { href: string; label: string; badge?: number }[];
}) {
  const pathname = usePathname();
  return (
    <div className="flex gap-6">
      {links.map((l) => {
        const active =
          l.href === "/admin" || l.href === "/board"
            ? pathname === l.href || pathname.startsWith(l.href + "/")
            : pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-[3px] pt-1 pb-2.5 text-sm font-bold whitespace-nowrap transition-colors",
              active
                ? "border-ted text-white"
                : "border-transparent text-white/60 hover:border-white/30 hover:text-white"
            )}
          >
            {l.label}
            {l.badge ? (
              <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-ted px-1.5 text-[10px] font-extrabold text-white">
                {l.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
