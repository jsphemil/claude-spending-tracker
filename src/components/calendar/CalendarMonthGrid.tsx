import Link from "next/link";
import { formatMoney } from "@/lib/services/format";
import {
  calendarGrid,
  isSameMonthUTC,
  isTodayUTC,
  toDateKey,
  type MonthKey,
} from "@/lib/services/calendar";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Shared by /transactions/calendar and the Dashboard so both render the same
// month grid + per-day expense totals from one implementation.
export function CalendarMonthGrid({
  monthKey,
  totalsByDate,
}: {
  monthKey: MonthKey;
  totalsByDate: Map<string, number>;
}) {
  const days = calendarGrid(monthKey);

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border text-xs">
      {WEEKDAY_LABELS.map((label) => (
        <div key={label} className="bg-surface-2 px-1 py-1 text-center font-medium text-fg-muted">
          {label}
        </div>
      ))}
      {days.map((day) => {
        const dateKey = toDateKey(day);
        const total = totalsByDate.get(dateKey) ?? 0;
        const inMonth = isSameMonthUTC(day, monthKey);
        const today = isTodayUTC(day);

        return (
          <div key={dateKey} className={`min-h-16 bg-surface p-1 sm:min-h-20 ${inMonth ? "" : "bg-surface-2"}`}>
            <div className="flex items-start justify-between">
              <Link
                href={`/transactions?from=${dateKey}&to=${dateKey}`}
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                  today
                    ? "bg-accent text-white"
                    : inMonth
                      ? "text-fg hover:bg-surface-2"
                      : "text-fg-subtle hover:bg-surface-2"
                }`}
              >
                {day.getUTCDate()}
              </Link>
              <Link
                href={`/transactions/new?type=EXPENSE&date=${dateKey}`}
                aria-label={`Add transaction on ${dateKey}`}
                className="px-1 text-xs text-fg-subtle hover:text-fg"
              >
                +
              </Link>
            </div>
            {total > 0 && (
              <p className="mt-1 truncate text-[11px] font-medium text-danger">
                {formatMoney(total, "INR")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
