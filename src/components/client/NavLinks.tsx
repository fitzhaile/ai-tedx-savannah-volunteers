"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function NavLinks({
  links,
}: {
  links: { href: string; label: string; badge?: number }[];
}) {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 pb-2">
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
              "rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors",
              active ? "bg-ink text-white" : "text-ink-soft hover:bg-line/70"
            )}
          >
            {l.label}
            {l.badge ? (
              <span className="ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-ted px-1 text-[10px] font-bold text-white">
                {l.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
