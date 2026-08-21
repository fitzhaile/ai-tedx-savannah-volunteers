import { cn } from "@/lib/cn";

/** Capacity as an editorial meter: thin bar + plain-English count. */
export function CapacityPill({ filled, capacity }: { filled: number; capacity: number }) {
  const left = Math.max(0, capacity - filled);
  const pct = Math.min(100, Math.round((filled / Math.max(1, capacity)) * 100));
  const full = left === 0;
  const tight = !full && (left === 1 || pct >= 75);
  return (
    <div className="w-40 max-w-full">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-sm font-extrabold text-ink">
          {filled}
          <span className="text-ink-faint">/{capacity}</span>
        </span>
        <span
          className={cn(
            "eyebrow",
            full ? "text-ted" : tight ? "text-warn" : "text-ink-faint"
          )}
        >
          {full ? "Full" : `${left} spot${left === 1 ? "" : "s"} left`}
        </span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-ink/10">
        <div
          className={cn("h-full rounded-full", full ? "bg-ted" : tight ? "bg-warn" : "bg-ink")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
