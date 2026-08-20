"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/** Secondary nav for admin/board areas. First link matches exactly. */
export function SubNav({ links }: { links: { href: string; label: string; exact?: boolean }[] }) {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line pb-2">
      {links.map((l, i) => {
        const exact = l.exact ?? i === 0;
        const active = exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors",
              active ? "bg-ted-soft text-ted-dark" : "text-ink-soft hover:bg-line/70"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
