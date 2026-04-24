import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";

export function paiseToRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function paiseToRupeesDecimal(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function showTimeLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, "h:mm a")}`;
  return format(d, "EEE, d MMM · h:mm a");
}

export function shortDate(iso: string): string {
  return format(new Date(iso), "d MMM yyyy");
}

export function timeAgo(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function dateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}
