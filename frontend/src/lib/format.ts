import { format, formatDistanceToNowStrict } from "date-fns";

export function formatPKR(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-PK").format(value);
}

export function formatDate(iso: string | Date | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "MMM d, yyyy");
}

export function formatDateTime(iso: string | Date | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "MMM d, yyyy, h:mm a");
}

export function relativeTime(iso: string | Date | null): string {
  if (!iso) return "—";
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
}

/** "2026-08-11" style date strings from the API. */
export function formatDayString(day: string | null): string {
  if (!day) return "—";
  return format(new Date(day + "T00:00:00"), "MMM d, yyyy");
}
