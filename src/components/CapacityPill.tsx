import { cn } from "@/lib/cn";

/**
 * Capacity as people, not percent: one dot per spot, filled when taken.
 * (Echoes the red circle TED speakers stand in.) Large capacities fall back
 * to a bar so the row never grows unwieldy.
 */
const DOT_LIMIT = 12;

export function CapacityPill({ filled, capacity }: { filled: number; capacity: number }) {
  const taken = Math.min(filled, capacity);
  const left = Math.max(0, capacity - filled);
  const full = left === 0;
  const tight = !full && (left === 1 || taken / capacity >= 0.75);
  const label = full ? "Full" : `${left} spot${left === 1 ? "" : "s"} left`;
  const srText = `${taken} of ${capacity} spots filled, ${label.toLowerCase()}`;

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end" aria-label={srText}>
      {capacity <= DOT_LIMIT ? (
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {Array.from({ length: capacity }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-3 w-3 rounded-full",
                i < taken ? "bg-ted" : "border-2 border-ink/25 bg-transparent"
              )}
            />
          ))}
        </div>
      ) : (
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
          <div
            className={cn("h-full rounded-full", full ? "bg-ted" : "bg-ink")}
            style={{ width: `${Math.round((taken / capacity) * 100)}%` }}
          />
        </div>
      )}
      <span
        className={cn(
          "eyebrow",
          full ? "text-ted" : tight ? "text-warn" : "text-ink-faint"
        )}
        aria-hidden="true"
      >
        {taken}/{capacity} · {label}
      </span>
    </div>
  );
}
