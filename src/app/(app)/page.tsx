import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants/accounts";
import { formatMoney } from "@/lib/services/format";
import { applyDelta, getAccountBalanceDeltas, getNetWorthSeries } from "@/lib/services/balance";
import {
  monthLabel,
  monthParamString,
  monthRange,
  monthShortLabel,
  parseMonthParam,
  previousMonthEnd,
  shiftMonth,
  toDateKey,
} from "@/lib/services/calendar";
import { CategoryPieChart } from "@/components/charts/CategoryPieChart";
import { NetWorthTrendChart } from "@/components/charts/NetWorthTrendChart";
import { CalendarMonthGrid } from "@/components/calendar/CalendarMonthGrid";
import { DeleteTransactionButton } from "@/components/transactions/DeleteTransactionButton";
import { ensureMaterialized } from "@/lib/services/recurrence";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const { month } = await searchParams;
  const monthKey = parseMonthParam(month);
  const { start, end } = monthRange(monthKey);
  const periodStartCutoff = previousMonthEnd(monthKey);

  await ensureMaterialized(userId, { through: end });

  // Last 12 months ending at whichever month is being viewed, so paging
  // the Dashboard backward also shifts the trend window to match.
  const trendMonths = Array.from({ length: 12 }, (_, i) => shiftMonth(monthKey, i - 11));
  const trendCutoffs = trendMonths.map((mk) => monthRange(mk).end);

  const [accounts, deltasAtStart, deltasAtEnd, periodTransactions, dailyExpenseTotals, recentTransactions, netWorthSeries, goals] =
    await Promise.all([
      prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      getAccountBalanceDeltas(userId, { asOf: periodStartCutoff }),
      getAccountBalanceDeltas(userId, { asOf: end }),
      prisma.transaction.findMany({
        where: { userId, type: { in: ["INCOME", "EXPENSE"] }, date: { gte: start, lte: end } },
        select: { type: true, amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["date"],
        where: { userId, type: "EXPENSE", date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: { userId, date: { lte: end } },
        orderBy: { date: "desc" },
        take: 5,
        include: { account: true, category: true, fromAccount: true, toAccount: true },
      }),
      getNetWorthSeries(userId, trendCutoffs),
      prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, take: 3 }),
    ]);

  const netWorthTrendData = trendMonths.map((mk, i) => ({
    label: monthShortLabel(mk),
    value: netWorthSeries[i],
  }));

  const balances = accounts.map((a) => ({
    account: a,
    balance: applyDelta(a.id, deltasAtEnd),
  }));
  const netWorth = balances.reduce((sum, b) => sum + b.balance, 0);
  const carryForward = accounts.reduce((sum, a) => sum + applyDelta(a.id, deltasAtStart), 0);
  const creditCardAccounts = balances.filter((b) => b.account.type === "CREDIT_CARD");
  const creditCardDebt =
    creditCardAccounts.length > 0
      ? creditCardAccounts.reduce((sum, b) => sum + Math.max(0, -b.balance), 0)
      : null;

  // Composition of positive assets by liquidity, not a capacity gauge (so a
  // regular flow-ratio pie is the right shape here, unlike the Used/
  // Available ones above) — Credit Card balances are debt, not an asset,
  // so they're excluded from the pie and shown as their own figure instead.
  const assetAllocation = [
    { name: "Liquid (Savings/Wallet)", types: ["SAVINGS", "WALLET"], color: "#3b82f6" },
    { name: "Deposits (FD/RD)", types: ["DEPOSIT"], color: "#f59e0b" },
    { name: "Invested", types: ["INVESTMENT"], color: "#8b5cf6" },
  ]
    .map((bucket) => ({
      name: bucket.name,
      color: bucket.color,
      value: balances
        .filter((b) => bucket.types.includes(b.account.type))
        .reduce((sum, b) => sum + Math.max(0, b.balance), 0),
    }))
    .filter((b) => b.value > 0);

  // Portfolio-level income/expense deliberately excludes transfers — every
  // transfer's inflow to one of the user's accounts is matched by an equal
  // outflow from another, so across the whole portfolio they cancel out and
  // only add noise. (Individual account pages still show transfers, since
  // those aren't symmetric for a single account.)
  const income = periodTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = periodTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // A gauge, not a flow-ratio pie: the ring's total capacity is what the
  // portfolio had available this period (Carry Forward + Income, transfers
  // excluded since they cancel out across accounts), Used eats into it, and
  // Available is what's left — which is exactly Net Worth, since transfers
  // net to zero at the portfolio level (Carry Forward + Income − Expense =
  // Net Worth). Clamped to 0 rather than going negative so an overspent
  // portfolio still renders as a full ring instead of vanishing.
  const totalAvailable = carryForward + income;
  const percentUsed = totalAvailable > 0 ? (expense / totalAvailable) * 100 : null;
  const pieData = [
    { name: "Used", value: expense, color: "#ef4444" },
    { name: "Available", value: Math.max(0, totalAvailable - expense), color: "#22c55e" },
  ].filter((d) => d.value > 0);

  const totalsByDate = new Map<string, number>();
  for (const row of dailyExpenseTotals) {
    totalsByDate.set(toDateKey(row.date), Number(row._sum.amount ?? 0));
  }

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

      <div className="mt-4">
        <CategoryPieChart
          data={pieData}
          currency="INR"
          showDataLabels
          centerLabel="Net worth"
          centerValue={formatMoney(netWorth, "INR")}
          centerSubtext={percentUsed !== null ? `${percentUsed.toFixed(0)}% used` : undefined}
        />
        {netWorth < 0 && (
          <p className="mt-1 text-center text-xs font-medium text-rose-600">
            Net position: {formatMoney(netWorth, "INR")}
          </p>
        )}
      </div>

      <div className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-zinc-500">Carry Forward</span>
          <span className="font-medium text-zinc-900">{formatMoney(carryForward, "INR")}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-zinc-500">Income</span>
          <span className="font-medium text-emerald-700">{formatMoney(income, "INR")}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-zinc-500">Expense</span>
          <span className="font-medium text-rose-700">{formatMoney(expense, "INR")}</span>
        </div>
        {creditCardDebt !== null && (
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-zinc-500">Credit card debt</span>
            <span className="font-medium text-rose-700">{formatMoney(creditCardDebt, "INR")}</span>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-zinc-900">Net worth trend</h2>
        <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-3">
          <NetWorthTrendChart data={netWorthTrendData} currency="INR" />
        </div>
      </div>

      {assetAllocation.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-900">Asset Allocation</h2>
          <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-3">
            <CategoryPieChart data={assetAllocation} currency="INR" showDataLabels height={220} />
            {creditCardDebt !== null && creditCardDebt > 0 && (
              <p className="mt-2 text-center text-xs text-zinc-500">
                Not included above — <span className="font-medium text-rose-600">Credit card debt: {formatMoney(creditCardDebt, "INR")}</span>
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Goals</h2>
          <Link href="/goals" className="text-sm font-medium text-zinc-500 hover:underline">
            {goals.length === 0 ? "Set a goal" : "View all"}
          </Link>
        </div>

        {goals.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No goals yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {goals.map((goal) => {
              const target = Number(goal.targetAmount);
              const percent = Math.min(100, Math.max(0, (netWorth / target) * 100));
              return (
                <li key={goal.id} className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-zinc-900">{goal.name}</span>
                    <span className="text-zinc-500">{percent.toFixed(0)}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className={`h-full ${percent >= 100 ? "bg-emerald-500" : "bg-blue-500"}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-zinc-900">{monthLabel(monthKey)}</h2>
        <div className="mt-2">
          <CalendarMonthGrid monthKey={monthKey} totalsByDate={totalsByDate} />
        </div>
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
                    {t.isOpeningBalance
                      ? `🏦 Opening balance · ${t.account?.name}`
                      : t.type === "TRANSFER"
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
                  {t.isOpeningBalance ? (
                    <Link
                      href={`/accounts/${t.accountId}/edit`}
                      className="text-xs font-medium text-zinc-500 hover:underline"
                    >
                      Edit account
                    </Link>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
