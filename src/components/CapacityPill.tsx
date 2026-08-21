import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/** Capacity at a glance: a thin meter plus the plain-English count. */
export function CapacityPill({ filled, capacity }: { filled: number; capacity: number }) {
  const taken = Math.min(filled, capacity);
  const left = Math.max(0, capacity - filled);
  const pct = Math.round((taken / Math.max(1, capacity)) * 100);
  const full = left === 0;
  const tight = !full && (left === 1 || pct >= 75);
  return (
    <div className="w-44 max-w-full">
      <Progress value={pct} className="h-1.5" />
      <p
        className={cn(
          "mt-1.5 text-xs font-medium",
          full ? "text-ted" : tight ? "text-warn" : "text-muted-foreground"
        )}
      >
        {taken} of {capacity} filled · {full ? "Full" : `${left} spot${left === 1 ? "" : "s"} left`}
      </p>
    </div>
  );
}
