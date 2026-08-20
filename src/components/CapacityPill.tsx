import { Badge } from "@/components/ui";

export function CapacityPill({ filled, capacity }: { filled: number; capacity: number }) {
  const left = capacity - filled;
  if (left <= 0) {
    return <Badge tone="red">Full · {capacity} of {capacity}</Badge>;
  }
  const tone = left === 1 || filled / capacity >= 0.75 ? "amber" : "green";
  return (
    <Badge tone={tone}>
      {filled} of {capacity} filled · {left} spot{left === 1 ? "" : "s"} left
    </Badge>
  );
}
