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
