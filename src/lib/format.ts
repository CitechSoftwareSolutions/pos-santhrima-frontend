export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `Rs. ${formatted}`;
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDateOnly(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Converts a local calendar-day range (as "YYYY-MM-DD" strings, e.g. from
 * <input type="date">) into the correct UTC instant boundaries for that range
 * in the browser's local timezone. Necessary because sale timestamps are
 * stored in UTC, but "today"/date-range filters are always local calendar days.
 */
export function toUtcRangeIso(dateFromLocal: string, dateToLocal: string): { dateFrom: string; dateTo: string } {
  const start = new Date(`${dateFromLocal}T00:00:00`);
  const endExclusive = new Date(`${dateToLocal}T00:00:00`);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return { dateFrom: start.toISOString(), dateTo: endExclusive.toISOString() };
}

export type DateFilterPreset = "today" | "yesterday" | "this_week" | "this_month";

export const DATE_FILTER_OPTIONS: { value: DateFilterPreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
];

export function getDateFilterRange(preset: DateFilterPreset): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  switch (preset) {
    case "today": {
      const today = toDateInputValue(now);
      return toUtcRangeIso(today, today);
    }
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = toDateInputValue(yesterday);
      return toUtcRangeIso(yStr, yStr);
    }
    case "this_week": {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return toUtcRangeIso(toDateInputValue(monday), toDateInputValue(sunday));
    }
    case "this_month": {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return toUtcRangeIso(toDateInputValue(firstDay), toDateInputValue(lastDay));
    }
  }
}
