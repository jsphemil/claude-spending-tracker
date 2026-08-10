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

      <div className="mt-4">
        <CalendarMonthGrid monthKey={monthKey} totalsByDate={totalsByDate} />
      </div>
    </div>
  );
}
