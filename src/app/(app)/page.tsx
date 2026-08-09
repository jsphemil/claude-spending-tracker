import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants/accounts";
import { formatMoney } from "@/lib/services/format";
import { applyDelta, getAccountBalanceDeltas, openingBalanceInPeriod } from "@/lib/services/balance";
import {
  monthLabel,
  monthParamString,
  monthRange,
  parseMonthParam,
  previousMonthEnd,
  shiftMonth,
} from "@/lib/services/calendar";
import { addToBucket, sortedBuckets, type Bucket } from "@/lib/services/breakdown";
import { CategoryPieChart } from "@/components/charts/CategoryPieChart";
import { DeleteTransactionButton } from "@/components/transactions/DeleteTransactionButton";
import { ensureMaterialized } from "@/lib/services/recurrence";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  await ensureMaterialized(userId);

  const { month } = await searchParams;
  const monthKey = parseMonthParam(month);
  const { start, end } = monthRange(monthKey);
  const periodStartCutoff = previousMonthEnd(monthKey);

  const [accounts, deltasAtStart, deltasAtEnd, periodTransactions, transferAgg, recentTransactions] =
    await Promise.all([
      prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      getAccountBalanceDeltas(userId, { asOf: periodStartCutoff }),
      getAccountBalanceDeltas(userId, { asOf: end }),
      prisma.transaction.findMany({
        where: { userId, type: { in: ["INCOME", "EXPENSE"] }, date: { gte: start, lte: end } },
        include: { category: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: "TRANSFER", date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: { userId, date: { lte: end } },
        orderBy: { date: "desc" },
        take: 5,
        include: { account: true, category: true, fromAccount: true, toAccount: true },
      }),
    ]);

  const balances = accounts.map((a) => ({
    account: a,
    balance: applyDelta(a, deltasAtEnd, end),
  }));
  const netWorth = balances.reduce((sum, b) => sum + b.balance, 0);
  const carryForward = accounts.reduce(
    (sum, a) => sum + applyDelta(a, deltasAtStart, periodStartCutoff),
    0
  );
  const creditCardAccounts = balances.filter((b) => b.account.type === "CREDIT_CARD");
  const creditCardDebt =
    creditCardAccounts.length > 0
      ? creditCardAccounts.reduce((sum, b) => sum + Math.max(0, -b.balance), 0)
      : null;

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

  for (const a of accounts) {
    const ob = openingBalanceInPeriod(a, start, end);
    if (ob > 0) {
      income += ob;
      addToBucket(incomeByCategory, "opening-balance", "Opening Balance", "🏦", ob);
    } else if (ob < 0) {
      expense += -ob;
      addToBucket(expenseByCategory, "opening-balance", "Opening Balance", "🏦", -ob);
    }
  }

  const transferSum = Number(transferAgg._sum.amount ?? 0);
  const totalIn = income + transferSum;
  const totalOut = expense + transferSum;
  const leftToSpend = totalIn - totalOut;

  const categories = await prisma.category.findMany({
    where: { userId },
    select: { id: true, color: true },
  });
  const colorById = new Map(categories.map((c) => [c.id, c.color]));
  const toPieData = (buckets: Bucket[]) =>
    buckets.map((b) => ({ name: b.name, value: b.total, color: colorById.get(b.key) ?? "#a1a1aa" }));

  const cashFlowData = [
    { name: "Income", value: income, color: "#22c55e" },
    { name: "Transfer In", value: transferSum, color: "#3b82f6" },
    { name: "Expense", value: expense, color: "#ef4444" },
    { name: "Transfer Out", value: transferSum, color: "#eab308" },
  ].filter((d) => d.value > 0);

  const prevMonth = monthParamString(shiftMonth(monthKey, -1));
  const nextMonth = monthParamString(shiftMonth(monthKey, 1));

  return (
    <div className="max-w-md p-6">
      <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>

      <div className="mt-4 flex items-center justify-between">
        <Link
          href={`/?month=${prevMonth}`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          ← Prev
        </Link>
        <p className="text-sm font-medium text-zinc-900">{monthLabel(monthKey)}</p>
        <Link
          href={`/?month=${nextMonth}`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          Next →
        </Link>
      </div>

      <p className="mt-4 text-sm text-zinc-500">Net worth as of end of {monthLabel(monthKey)}</p>
      <p className="text-3xl font-semibold text-zinc-900">{formatMoney(netWorth, "INR")}</p>

      <div className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-zinc-500">Carry Forward</span>
          <span className="font-medium text-zinc-900">{formatMoney(carryForward, "INR")}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-zinc-500">Total In</span>
          <span className="font-medium text-emerald-700">{formatMoney(totalIn, "INR")}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-zinc-500">Total Out</span>
          <span className="font-medium text-rose-700">{formatMoney(totalOut, "INR")}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-zinc-500">Left to Spend</span>
          <span className={`font-medium ${leftToSpend >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {formatMoney(leftToSpend, "INR")}
          </span>
        </div>
        {creditCardDebt !== null && (
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-zinc-500">Credit card debt</span>
            <span className="font-medium text-rose-700">{formatMoney(creditCardDebt, "INR")}</span>
          </div>
        )}
      </div>

      <div className="mt-6">
        <CategoryPieChart data={cashFlowData} currency="INR" />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <Link
          href="/transactions/new?type=INCOME"
          className="rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Income
        </Link>
        <Link
          href="/transactions/new?type=EXPENSE"
          className="rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Expense
        </Link>
        <Link
          href="/transactions/new?type=TRANSFER"
          className="rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Transfer
        </Link>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-zinc-900">Income by category</h2>
        <CategoryPieChart data={toPieData(sortedBuckets(incomeByCategory))} currency="INR" />
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-zinc-900">Expense by category</h2>
        <CategoryPieChart data={toPieData(sortedBuckets(expenseByCategory))} currency="INR" />

        {sortedBuckets(expenseByCategory).length > 0 && (
          <ul className="mt-3 space-y-1">
            {sortedBuckets(expenseByCategory).map((b) => (
              <li key={b.key} className="flex items-center justify-between text-sm">
                <span className="text-zinc-700">
                  {b.icon} {b.name}
                </span>
                <span className="font-medium text-rose-700">{formatMoney(b.total, "INR")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Accounts</h2>
          <Link href="/accounts" className="text-sm font-medium text-zinc-500 hover:underline">
            View all
          </Link>
        </div>

        {balances.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No accounts yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {balances.map(({ account, balance }) => (
              <li key={account.id}>
                <Link
                  href={`/accounts/${account.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 hover:bg-zinc-50"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                      style={{ backgroundColor: account.color + "20" }}
                    >
                      {account.icon}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{account.name}</p>
                      <p className="text-xs text-zinc-500">{ACCOUNT_TYPE_LABELS[account.type]}</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-zinc-900">
                    {formatMoney(balance, account.currency)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Recent transactions</h2>
          <Link href="/transactions" className="text-sm font-medium text-zinc-500 hover:underline">
            View all
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No transactions yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recentTransactions.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {t.type === "TRANSFER"
                      ? `${t.fromAccount?.name} → ${t.toAccount?.name}`
                      : `${t.category?.name ?? "Uncategorized"} · ${t.account?.name}`}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {t.date.toISOString().slice(0, 10)}
                    {t.recurringRuleId ? " · 🔁" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p
                    className={`text-sm font-medium ${
                      t.type === "INCOME"
                        ? "text-emerald-700"
                        : t.type === "EXPENSE"
                          ? "text-rose-700"
                          : "text-zinc-700"
                    }`}
                  >
                    {t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "−" : ""}
                    {formatMoney(
                      Number(t.amount),
                      t.type === "TRANSFER" ? "INR" : (t.account?.currency ?? "INR")
                    )}
                  </p>
                  <Link
                    href={`/transactions/${t.id}/edit`}
                    className="text-xs font-medium text-zinc-500 hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteTransactionButton
                    transactionId={t.id}
                    redirectTo="/"
                    isRecurring={!!t.recurringRuleId}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
