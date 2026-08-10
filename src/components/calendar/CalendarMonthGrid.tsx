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
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 text-xs">
      {WEEKDAY_LABELS.map((label) => (
        <div key={label} className="bg-zinc-50 px-1 py-1 text-center font-medium text-zinc-500">
          {label}
        </div>
      ))}
      {days.map((day) => {
        const dateKey = toDateKey(day);
        const total = totalsByDate.get(dateKey) ?? 0;
        const inMonth = isSameMonthUTC(day, monthKey);
        const today = isTodayUTC(day);

        return (
          <div key={dateKey} className={`min-h-16 bg-white p-1 sm:min-h-20 ${inMonth ? "" : "bg-zinc-50"}`}>
            <div className="flex items-start justify-between">
              <Link
                href={`/transactions?from=${dateKey}&to=${dateKey}`}
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                  today
                    ? "bg-zinc-900 text-white"
                    : inMonth
                      ? "text-zinc-700 hover:bg-zinc-100"
                      : "text-zinc-300 hover:bg-zinc-100"
                }`}
              >
                {day.getUTCDate()}
              </Link>
              <Link
                href={`/transactions/new?type=EXPENSE&date=${dateKey}`}
                aria-label={`Add transaction on ${dateKey}`}
                className="px-1 text-xs text-zinc-300 hover:text-zinc-700"
              >
                +
              </Link>
            </div>
            {total > 0 && (
              <p className="mt-1 truncate text-[11px] font-medium text-rose-700">
                {formatMoney(total, "INR")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
