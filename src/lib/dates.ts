import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** Savannah, GA. All storage is UTC; all display goes through these helpers. */
export const TZ = "America/New_York";

/** "Saturday, May 15" */
export function fmtDay(d: Date): string {
  return formatInTimeZone(d, TZ, "EEEE, MMMM d");
}

/** "Sat, May 15, 2027" */
export function fmtDateShort(d: Date): string {
  return formatInTimeZone(d, TZ, "EEE, MMM d, yyyy");
}

/** "7:00 AM" */
export function fmtTime(d: Date): string {
  return formatInTimeZone(d, TZ, "h:mm a");
}

/** "7:00–10:30 AM" or "10:30 AM–2:00 PM" */
export function fmtTimeRange(start: Date, end: Date): string {
  const a = formatInTimeZone(start, TZ, "h:mm a");
  const b = formatInTimeZone(end, TZ, "h:mm a");
  const [at, ap] = a.split(" ");
  const [, bp] = b.split(" ");
  return ap === bp ? `${at}–${b}` : `${a}–${b}`;
}

/** "Sat, May 15 · 7:00–10:30 AM" */
export function fmtShiftWhen(start: Date, end: Date): string {
  return `${formatInTimeZone(start, TZ, "EEE, MMM d")} · ${fmtTimeRange(start, end)}`;
}

/** Calendar-day key in Savannah time, e.g. "2027-05-15". */
export function dayKey(d: Date): string {
  return formatInTimeZone(d, TZ, "yyyy-MM-dd");
}

/** Start of a Savannah calendar day (UTC instant). */
export function startOfEtDay(d: Date): Date {
  return fromZonedTime(`${dayKey(d)}T00:00:00`, TZ);
}

/** For datetime-local form inputs: "2027-05-15T07:00" in Savannah time. */
export function toInputValue(d: Date): string {
  return formatInTimeZone(d, TZ, "yyyy-MM-dd'T'HH:mm");
}

/** Parse a datetime-local input value as Savannah wall time -> UTC instant. */
export function fromInputValue(v: string): Date {
  return fromZonedTime(v, TZ);
}
