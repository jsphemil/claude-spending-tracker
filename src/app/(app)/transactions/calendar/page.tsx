import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/services/format";
import {
  calendarGrid,
  isSameMonthUTC,
  isTodayUTC,
  monthLabel,
  monthParamString,
  monthRange,
  parseMonthParam,
  shiftMonth,
  toDateKey,
} from "@/lib/services/calendar";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const { month } = await searchParams;
  const monthKey = parseMonthParam(month);
  const { start, end } = monthRange(monthKey);

  const totals = await prisma.transaction.groupBy({
    by: ["date"],
    where: { userId, type: "EXPENSE", date: { gte: start, lte: end } },
    _sum: { amount: true },
  });

  const totalsByDate = new Map<string, number>();
  for (const row of totals) {
    totalsByDate.set(toDateKey(row.date), Number(row._sum.amount ?? 0));
  }

  const days = calendarGrid(monthKey);
  const prevMonth = monthParamString(shiftMonth(monthKey, -1));
  const nextMonth = monthParamString(shiftMonth(monthKey, 1));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Calendar</h1>
        <Link href="/transactions" className="text-sm font-medium text-zinc-500 hover:underline">
          List view
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Link
          href={`/transactions/calendar?month=${prevMonth}`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          ← Prev
        </Link>
        <p className="text-sm font-medium text-zinc-900">{monthLabel(monthKey)}</p>
        <Link
          href={`/transactions/calendar?month=${nextMonth}`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          Next →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 text-xs">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="bg-zinc-50 px-1 py-1 text-center font-medium text-zinc-500"
          >
            {label}
          </div>
        ))}
        {days.map((day) => {
          const dateKey = toDateKey(day);
          const total = totalsByDate.get(dateKey) ?? 0;
          const inMonth = isSameMonthUTC(day, monthKey);
          const today = isTodayUTC(day);

          return (
            <div
              key={dateKey}
              className={`min-h-16 bg-white p-1 sm:min-h-20 ${inMonth ? "" : "bg-zinc-50"}`}
            >
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
    </div>
  );
}
