import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import {
  monthLabel,
  monthParamString,
  monthRange,
  parseMonthParam,
  shiftMonth,
  toDateKey,
} from "@/lib/services/calendar";
import { ensureMaterialized } from "@/lib/services/recurrence";
import { CalendarMonthGrid } from "@/components/calendar/CalendarMonthGrid";

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

  await ensureMaterialized(userId, { through: end });

  const totals = await prisma.transaction.groupBy({
    by: ["date"],
    where: { userId, type: "EXPENSE", date: { gte: start, lte: end } },
    _sum: { amount: true },
  });

  const totalsByDate = new Map<string, number>();
  for (const row of totals) {
    totalsByDate.set(toDateKey(row.date), Number(row._sum.amount ?? 0));
  }

  const prevMonth = monthParamString(shiftMonth(monthKey, -1));
  const nextMonth = monthParamString(shiftMonth(monthKey, 1));

  return (
    <div className="mx-auto w-full max-w-[1400px] p-6 lg:p-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight text-fg">Calendar</h1>
        <div className="flex items-center gap-3">
          <Link href="/transactions" className="text-sm font-medium text-fg-muted hover:underline">
            List view
          </Link>
          <div className="flex items-center gap-0.5 rounded-full border border-border bg-surface p-1">
            <Link
              href={`/transactions/calendar?month=${prevMonth}`}
              aria-label="Previous month"
              className="flex h-7 w-7 items-center justify-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg"
            >
              ‹
            </Link>
            <span className="px-2.5 text-[13px] font-medium text-fg">{monthLabel(monthKey)}</span>
            <Link
              href={`/transactions/calendar?month=${nextMonth}`}
              aria-label="Next month"
              className="flex h-7 w-7 items-center justify-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg"
            >
              ›
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <CalendarMonthGrid monthKey={monthKey} totalsByDate={totalsByDate} />
      </div>
    </div>
  );
}
