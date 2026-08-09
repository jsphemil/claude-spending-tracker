// All UTC-based on purpose: transaction dates are stored as Postgres DATE
// (no time component) and parsed from "YYYY-MM-DD" strings as UTC midnight
// (see validation/transaction.ts's z.coerce.date()). Using local-time-aware
// date math here (e.g. most date-fns helpers) would silently shift month/day
// boundaries depending on the server's timezone — plain UTC arithmetic keeps
// this consistent regardless of where it runs.

export type MonthKey = { year: number; monthIndex: number }; // monthIndex is 0-based

export function parseMonthParam(param: string | undefined): MonthKey {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [year, month] = param.split("-").map(Number);
    return { year, monthIndex: month - 1 };
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), monthIndex: now.getUTCMonth() };
}

export function monthParamString({ year, monthIndex }: MonthKey) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function monthLabel({ year, monthIndex }: MonthKey) {
  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function shiftMonth({ year, monthIndex }: MonthKey, delta: number): MonthKey {
  const d = new Date(Date.UTC(year, monthIndex + delta, 1));
  return { year: d.getUTCFullYear(), monthIndex: d.getUTCMonth() };
}

export function monthRange({ year, monthIndex }: MonthKey) {
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 0)),
  };
}

// The last day of the month before this one — the cutoff for "Carry
// Forward" (this period's opening balance is last period's closing one).
export function previousMonthEnd({ year, monthIndex }: MonthKey): Date {
  return new Date(Date.UTC(year, monthIndex, 0));
}

// A 6-week (42-day) grid starting on the Sunday on/before the 1st of the month.
export function calendarGrid({ year, monthIndex }: MonthKey): Date[] {
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  return Array.from(
    { length: 42 },
    (_, i) => new Date(Date.UTC(year, monthIndex, 1 - firstWeekday + i))
  );
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function isSameMonthUTC(date: Date, { year, monthIndex }: MonthKey) {
  return date.getUTCFullYear() === year && date.getUTCMonth() === monthIndex;
}

export function isTodayUTC(date: Date) {
  return toDateKey(date) === toDateKey(new Date());
}
