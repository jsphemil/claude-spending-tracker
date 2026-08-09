import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/services/format";
import { applyDelta, getAccountBalanceDeltas } from "@/lib/services/balance";
import {
  monthLabel,
  monthParamString,
  monthRange,
  parseMonthParam,
  shiftMonth,
} from "@/lib/services/calendar";
import { addToBucket, sortedBuckets, type Bucket } from "@/lib/services/breakdown";
import { CategoryPieChart } from "@/components/charts/CategoryPieChart";
import { SummaryAccountFilter } from "@/components/summary/SummaryAccountFilter";
import { ensureMaterialized } from "@/lib/services/recurrence";

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; accountId?: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  await ensureMaterialized(userId);

  const { month, accountId: rawAccountId } = await searchParams;
  const monthKey = parseMonthParam(month);
  const { start, end } = monthRange(monthKey);
  const periodStartCutoff = new Date(Date.UTC(monthKey.year, monthKey.monthIndex, 0));

  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  const selectedAccount = accounts.find((a) => a.id === rawAccountId);

  const periodTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: { in: ["INCOME", "EXPENSE"] },
      date: { gte: start, lte: end },
      ...(selectedAccount ? { accountId: selectedAccount.id } : {}),
    },
    include: { category: true },
  });

  const incomeByCategory = new Map<string, Bucket>();
  const expenseByCategory = new Map<string, Bucket>();
  let income = 0;
  let expense = 0;

  for (const t of periodTransactions) {
    const amt = Number(t.amount);
    if (t.type === "INCOME") {
      income += amt;
      addToBucket(
        incomeByCategory,
        t.categoryId ?? "uncategorized",
        t.category?.name ?? "Uncategorized",
        t.category?.icon ?? "❓",
        amt
      );
    } else {
      expense += amt;
      addToBucket(
        expenseByCategory,
        t.categoryId ?? "uncategorized",
        t.category?.name ?? "Uncategorized",
        t.category?.icon ?? "❓",
        amt
      );
    }
  }

  const categories = await prisma.category.findMany({
    where: { userId },
    select: { id: true, color: true },
  });
  const colorById = new Map(categories.map((c) => [c.id, c.color]));
  const toPieData = (buckets: Bucket[]) =>
    buckets.map((b) => ({ name: b.name, value: b.total, color: colorById.get(b.key) ?? "#a1a1aa" }));

  const [deltasAtStart, deltasAtEnd] = await Promise.all([
    getAccountBalanceDeltas(userId, { asOf: periodStartCutoff }),
    getAccountBalanceDeltas(userId, { asOf: end }),
  ]);

  let carryForward: number;
  let endingBalance: number;
  let currency = "INR";
  let creditCardDebt: number | null = null;

  if (selectedAccount) {
    const opening = Number(selectedAccount.openingBalance);
    carryForward = applyDelta(opening, deltasAtStart, selectedAccount.id);
    endingBalance = applyDelta(opening, deltasAtEnd, selectedAccount.id);
    currency = selectedAccount.currency;
  } else {
    carryForward = accounts.reduce(
      (sum, a) => sum + applyDelta(Number(a.openingBalance), deltasAtStart, a.id),
      0
    );
    endingBalance = accounts.reduce(
      (sum, a) => sum + applyDelta(Number(a.openingBalance), deltasAtEnd, a.id),
      0
    );
    const creditCardAccounts = accounts.filter((a) => a.type === "CREDIT_CARD");
    if (creditCardAccounts.length > 0) {
      creditCardDebt = creditCardAccounts.reduce((sum, a) => {
        const bal = applyDelta(Number(a.openingBalance), deltasAtEnd, a.id);
        return sum + Math.max(0, -bal);
      }, 0);
    }
  }

  const prevMonth = monthParamString(shiftMonth(monthKey, -1));
  const nextMonth = monthParamString(shiftMonth(monthKey, 1));
  const accountQuery = selectedAccount ? `&accountId=${selectedAccount.id}` : "";

  return (
    <div className="max-w-md p-6">
      <h1 className="text-xl font-semibold text-zinc-900">Summary</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SummaryAccountFilter accounts={accounts.map((a) => ({ id: a.id, name: a.name, icon: a.icon }))} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Link
          href={`/summary?month=${prevMonth}${accountQuery}`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          ← Prev
        </Link>
        <p className="text-sm font-medium text-zinc-900">{monthLabel(monthKey)}</p>
        <Link
          href={`/summary?month=${nextMonth}${accountQuery}`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          Next →
        </Link>
      </div>

      <div className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-zinc-500">Carry Forward</span>
          <span className="font-medium text-zinc-900">{formatMoney(carryForward, currency)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-zinc-500">Income</span>
          <span className="font-medium text-emerald-700">{formatMoney(income, currency)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-zinc-500">Expense</span>
          <span className="font-medium text-rose-700">{formatMoney(expense, currency)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-zinc-500">
            {selectedAccount ? "Ending balance" : "Ending balance (net worth)"}
          </span>
          <span className="font-medium text-zinc-900">{formatMoney(endingBalance, currency)}</span>
        </div>
        {creditCardDebt !== null && (
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-zinc-500">Credit card debt</span>
            <span className="font-medium text-rose-700">{formatMoney(creditCardDebt, "INR")}</span>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-zinc-900">Income by category</h2>
        <CategoryPieChart data={toPieData(sortedBuckets(incomeByCategory))} currency={currency} />
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-zinc-900">Expense by category</h2>
        <CategoryPieChart data={toPieData(sortedBuckets(expenseByCategory))} currency={currency} />

        {sortedBuckets(expenseByCategory).length > 0 && (
          <ul className="mt-3 space-y-1">
            {sortedBuckets(expenseByCategory).map((b) => (
              <li key={b.key} className="flex items-center justify-between text-sm">
                <span className="text-zinc-700">
                  {b.icon} {b.name}
                </span>
                <span className="font-medium text-rose-700">{formatMoney(b.total, currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
