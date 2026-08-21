"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/** Secondary nav for admin/board areas. First link matches exactly. */
export function SubNav({ links }: { links: { href: string; label: string; exact?: boolean }[] }) {
  const pathname = usePathname();
  return (
    <div className="-mt-2 mb-8 flex gap-5 overflow-x-auto border-b border-line">
      {links.map((l, i) => {
        const exact = l.exact ?? i === 0;
        const active = exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "-mb-px rounded-sm border-b-2 pb-2.5 text-sm font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ted",
              active ? "border-ink text-ink" : "border-transparent text-ink-faint hover:text-ink"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
