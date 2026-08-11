import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants/accounts";
import { formatMoney } from "@/lib/services/format";
import { applyDelta, getAccountBalanceDeltas, getNetWorthSeries } from "@/lib/services/balance";
import { getRatesToINR } from "@/lib/services/currency";
import { CurrencyAmount } from "@/components/shared/CurrencyAmount";
import {
  monthLabel,
  monthParamString,
  monthRange,
  monthShortLabel,
  monthsBetween,
  parseMonthParam,
  previousMonthEnd,
  shiftMonth,
  toDateKey,
} from "@/lib/services/calendar";
import { CategoryPieChart } from "@/components/charts/CategoryPieChart";
import { NetWorthTrendChart } from "@/components/charts/NetWorthTrendChart";
import { NetWorthRing } from "@/components/charts/NetWorthRing";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/nav/icons";
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

  // Up to 12 months ending at whichever month is being viewed, so paging
  // the Dashboard backward also shifts the trend window to match — but
  // never further back than the account's own history, so a profile
  // created this month doesn't show 11 months of misleading flat-zero
  // padding before it existed.
  const earliestTransaction = await prisma.transaction.findFirst({
    where: { userId },
    orderBy: { date: "asc" },
    select: { date: true },
  });
  const earliestMonthKey = earliestTransaction
    ? { year: earliestTransaction.date.getUTCFullYear(), monthIndex: earliestTransaction.date.getUTCMonth() }
    : monthKey;
  const trendLength = Math.min(12, Math.max(1, monthsBetween(earliestMonthKey, monthKey) + 1));
  const trendMonths = Array.from({ length: trendLength }, (_, i) => shiftMonth(monthKey, i - (trendLength - 1)));
  const trendCutoffs = trendMonths.map((mk) => monthRange(mk).end);

  const [
    accounts,
    deltasAtStart,
    deltasAtEnd,
    periodTransactions,
    dailyExpenseTotals,
    recentTransactions,
    netWorthSeries,
    goals,
    budgetedCategories,
  ] = await Promise.all([
    prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    getAccountBalanceDeltas(userId, { asOf: periodStartCutoff }),
    getAccountBalanceDeltas(userId, { asOf: end }),
    prisma.transaction.findMany({
      where: { userId, type: { in: ["INCOME", "EXPENSE"] }, date: { gte: start, lte: end } },
      select: { type: true, amount: true, categoryId: true, account: { select: { currency: true } } },
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
    prisma.category.findMany({
      where: { userId, type: "EXPENSE", monthlyBudget: { not: null } },
      select: { id: true, name: true, icon: true, monthlyBudget: true },
    }),
  ]);

  // Cheap check against categories with a budget set, reusing
  // periodTransactions rather than another query — surfaces overspending
  // right where the user already lands, not just on the Categories page.
  const overBudgetCategories = budgetedCategories
    .map((c) => ({
      ...c,
      spent: periodTransactions
        .filter((t) => t.type === "EXPENSE" && t.categoryId === c.id)
        .reduce((sum, t) => sum + Number(t.amount), 0),
    }))
    .filter((c) => c.spent > Number(c.monthlyBudget));

  const netWorthTrendData = trendMonths.map((mk, i) => ({
    label: monthShortLabel(mk),
    value: netWorthSeries[i],
  }));

  // The whole point of this page is one figure across every account
  // (spec 5.8: "Overall balance across all accounts (in INR)") — every
  // aggregate below converts each account's own-currency amount to INR
  // before summing. Per-account figures (Accounts list, account pages)
  // stay in that account's native currency; only portfolio-level sums
  // convert. One rate lookup, reused for every conversion on this page.
  const rates = await getRatesToINR(accounts.map((a) => a.currency));
  const toINR = (amount: number, currency: string) =>
    currency === "INR" ? amount : amount * (rates[currency] ?? 1);

  const balances = accounts.map((a) => ({
    account: a,
    balance: applyDelta(a.id, deltasAtEnd),
  }));
  const netWorth = balances.reduce((sum, b) => sum + toINR(b.balance, b.account.currency), 0);
  const carryForward = accounts.reduce(
    (sum, a) => sum + toINR(applyDelta(a.id, deltasAtStart), a.currency),
    0
  );
  const creditCardAccounts = balances.filter((b) => b.account.type === "CREDIT_CARD");
  const creditCardDebt =
    creditCardAccounts.length > 0
      ? creditCardAccounts.reduce(
          (sum, b) => sum + toINR(Math.max(0, -b.balance), b.account.currency),
          0
        )
      : null;

  // Composition of positive assets by liquidity, not a capacity gauge (so a
  // regular flow-ratio pie is the right shape here, unlike the Used/
  // Available ones above) — Credit Card balances are debt, not an asset,
  // so they're excluded from the pie and shown as their own figure instead.
  const assetAllocation = [
    { name: "Liquid (Savings/Wallet)", types: ["SAVINGS", "WALLET"], color: "#7c6ef2" },
    { name: "Deposits (FD/RD)", types: ["DEPOSIT"], color: "#f0a63a" },
    { name: "Invested", types: ["INVESTMENT"], color: "#3aa0c9" },
  ]
    .map((bucket) => ({
      name: bucket.name,
      color: bucket.color,
      value: balances
        .filter((b) => bucket.types.includes(b.account.type))
        .reduce((sum, b) => sum + toINR(Math.max(0, b.balance), b.account.currency), 0),
    }))
    .filter((b) => b.value > 0);

  // Portfolio-level income/expense deliberately excludes transfers — every
  // transfer's inflow to one of the user's accounts is matched by an equal
  // outflow from another, so across the whole portfolio they cancel out and
  // only add noise. (Individual account pages still show transfers, since
  // those aren't symmetric for a single account.)
  const income = periodTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + toINR(Number(t.amount), t.account?.currency ?? "INR"), 0);
  const expense = periodTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + toINR(Number(t.amount), t.account?.currency ?? "INR"), 0);

  // A gauge, not a flow-ratio pie: the ring's total capacity is what the
  // portfolio had available this period (Carry Forward + Income, transfers
  // excluded since they cancel out across accounts), Used eats into it, and
  // Available is what's left — which is exactly Net Worth, since transfers
  // net to zero at the portfolio level (Carry Forward + Income − Expense =
  // Net Worth). Clamped to 0 rather than going negative so an overspent
  // portfolio still renders as a full ring instead of vanishing.
  const totalAvailable = carryForward + income;
  const percentUsed = totalAvailable > 0 ? (expense / totalAvailable) * 100 : null;

  const totalsByDate = new Map<string, number>();
  for (const row of dailyExpenseTotals) {
    totalsByDate.set(toDateKey(row.date), Number(row._sum.amount ?? 0));
  }

  const prevMonth = monthParamString(shiftMonth(monthKey, -1));
  const nextMonth = monthParamString(shiftMonth(monthKey, 1));

  const card = "rounded-2xl border border-border bg-surface p-5 shadow-sm";
  const cardHead = "mb-4 flex items-center justify-between";
  const cardTitle = "text-sm font-semibold text-fg";
  const link = "text-[12.5px] font-medium text-accent hover:underline";

  return (
    <div className="mx-auto w-full max-w-[1400px] p-6 lg:p-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-fg">Dashboard</h1>
        <div className="flex items-center gap-0.5 rounded-full border border-border bg-surface p-1">
          <Link
            href={`/?month=${prevMonth}`}
            aria-label="Previous month"
            className="flex h-7 w-7 items-center justify-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
          </Link>
          <span className="px-2.5 text-[13px] font-medium text-fg">{monthLabel(monthKey)}</span>
          <Link
            href={`/?month=${nextMonth}`}
            aria-label="Next month"
            className="flex h-7 w-7 items-center justify-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {overBudgetCategories.length > 0 && (
        <div className="mb-4 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3">
          {overBudgetCategories.map((c) => (
            <p key={c.id} className="text-xs font-medium text-danger">
              {c.icon} {c.name} is {formatMoney(c.spent - Number(c.monthlyBudget), "INR")} over its{" "}
              {formatMoney(Number(c.monthlyBudget), "INR")}/mo budget
            </p>
          ))}
          <Link href="/categories" className="text-xs font-medium text-danger hover:underline">
            Review budgets →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className={`${card} lg:col-span-5`}>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-fg-muted">Net worth</p>
          <NetWorthRing
            usedFraction={percentUsed !== null ? percentUsed / 100 : null}
            centerLabel={monthLabel(monthKey)}
            centerValue={formatMoney(netWorth, "INR")}
            centerSubtext={percentUsed !== null ? `${percentUsed.toFixed(0)}% of available used` : undefined}
          />
          {netWorth < 0 && (
            <p className="mt-3 text-xs font-medium text-danger">
              Overdrawn by {formatMoney(Math.abs(netWorth), "INR")}
            </p>
          )}
        </section>

        <section className={`${card} lg:col-span-7`}>
          <div className={cardHead}>
            <h2 className={cardTitle}>Net worth trend</h2>
            <span className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
              {trendLength >= 12 ? "Last 12 months" : `Since ${monthShortLabel(trendMonths[0])}`}
            </span>
          </div>
          <NetWorthTrendChart data={netWorthTrendData} currency="INR" height={180} />
        </section>

        <div className="grid grid-cols-2 gap-3 lg:col-span-12 sm:grid-cols-4">
          <div className="rounded-xl bg-surface-2 p-3.5">
            <p className="text-[11px] text-fg-muted">Carry forward</p>
            <p className="font-data mt-1.5 text-[17px] font-semibold tabular-nums text-fg">
              {formatMoney(carryForward, "INR")}
            </p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3.5">
            <p className="text-[11px] text-fg-muted">Income</p>
            <p className="font-data mt-1.5 text-[17px] font-semibold tabular-nums text-success">
              +{formatMoney(income, "INR")}
            </p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3.5">
            <p className="text-[11px] text-fg-muted">Expense</p>
            <p className="font-data mt-1.5 text-[17px] font-semibold tabular-nums text-danger">
              −{formatMoney(expense, "INR")}
            </p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3.5">
            <p className="text-[11px] text-fg-muted">Credit card debt</p>
            <p className="font-data mt-1.5 text-[17px] font-semibold tabular-nums text-fg">
              {creditCardDebt !== null ? formatMoney(creditCardDebt, "INR") : "—"}
            </p>
          </div>
        </div>

        <section className={`${card} lg:col-span-6`}>
          <div className={cardHead}>
            <h2 className={cardTitle}>Asset allocation</h2>
          </div>
          {assetAllocation.length > 0 ? (
            <>
              <CategoryPieChart data={assetAllocation} currency="INR" showDataLabels height={200} />
              {creditCardDebt !== null && creditCardDebt > 0 && (
                <p className="mt-2 text-center text-xs text-fg-muted">
                  Not included above —{" "}
                  <span className="font-medium text-danger">
                    Credit card debt: {formatMoney(creditCardDebt, "INR")}
                  </span>
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-fg-muted">No positive balances yet.</p>
          )}
        </section>

        <section className={`${card} lg:col-span-6`}>
          <div className={cardHead}>
            <h2 className={cardTitle}>Goals</h2>
            <Link href="/goals" className={link}>
              {goals.length === 0 ? "Set a goal" : "View all"}
            </Link>
          </div>

          {goals.length === 0 ? (
            <div>
              <p className="text-sm text-fg-muted">No goals yet — set a net worth target to track progress here.</p>
              <Link href="/goals/new" className={`${link} mt-2 inline-block`}>
                Create your first goal →
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {goals.map((goal) => {
                const target = Number(goal.targetAmount);
                const percent = Math.min(100, Math.max(0, (netWorth / target) * 100));
                return (
                  <li key={goal.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-fg">{goal.name}</span>
                      <span className="font-data tabular-nums text-fg-muted">{percent.toFixed(0)}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: percent >= 100 ? "var(--success)" : "var(--accent)",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={`${card} lg:col-span-12`}>
          <div className={cardHead}>
            <h2 className={cardTitle}>{monthLabel(monthKey)}</h2>
            <div className="flex gap-2">
              <Link
                href="/transactions/new?type=INCOME"
                className="rounded-lg border border-border px-3 py-1.5 text-center text-[12.5px] font-medium text-fg hover:bg-surface-2"
              >
                + Income
              </Link>
              <Link
                href="/transactions/new?type=EXPENSE"
                className="rounded-lg border border-border px-3 py-1.5 text-center text-[12.5px] font-medium text-fg hover:bg-surface-2"
              >
                + Expense
              </Link>
              <Link
                href="/transactions/new?type=TRANSFER"
                className="rounded-lg border border-border px-3 py-1.5 text-center text-[12.5px] font-medium text-fg hover:bg-surface-2"
              >
                + Transfer
              </Link>
            </div>
          </div>
          <CalendarMonthGrid monthKey={monthKey} totalsByDate={totalsByDate} />
        </section>

        <section className={`${card} lg:col-span-6`}>
          <div className={cardHead}>
            <h2 className={cardTitle}>Accounts</h2>
            <Link href="/accounts" className={link}>
              View all
            </Link>
          </div>

          {balances.length === 0 ? (
            <p className="text-sm text-fg-muted">No accounts yet.</p>
          ) : (
            <ul className="space-y-1">
              {balances.map(({ account, balance }) => (
                <li key={account.id}>
                  <Link
                    href={`/accounts/${account.id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-surface-2"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-lg"
                        style={{ backgroundColor: account.color + "20" }}
                      >
                        {account.icon}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-fg">{account.name}</p>
                        <p className="text-xs text-fg-muted">{ACCOUNT_TYPE_LABELS[account.type]}</p>
                      </div>
                    </div>
                    <CurrencyAmount
                      amount={balance}
                      currency={account.currency}
                      inrEquivalent={toINR(balance, account.currency)}
                      className="font-data text-sm font-medium tabular-nums text-fg"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} lg:col-span-6`}>
          <div className={cardHead}>
            <h2 className={cardTitle}>Recent transactions</h2>
            <Link href={`/transactions?from=${toDateKey(start)}&to=${toDateKey(end)}`} className={link}>
              View all
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <p className="text-sm text-fg-muted">No transactions yet.</p>
          ) : (
            <ul>
              {recentTransactions.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between border-t border-border py-2.5 first:border-t-0"
                >
                  <div>
                    <p className="text-[13.5px] font-medium text-fg">
                      {t.isOpeningBalance
                        ? `🏦 Opening balance · ${t.account?.name}`
                        : t.type === "TRANSFER"
                          ? `${t.fromAccount?.name} → ${t.toAccount?.name}`
                          : `${t.category?.name ?? "Uncategorized"} · ${t.account?.name}`}
                    </p>
                    <p className="text-[11.5px] text-fg-subtle">
                      {t.date.toISOString().slice(0, 10)}
                      {t.recurringRuleId ? " · 🔁" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p
                      className={`font-data text-[13.5px] font-semibold tabular-nums ${
                        t.type === "INCOME"
                          ? "text-success"
                          : t.type === "EXPENSE"
                            ? "text-danger"
                            : "text-transfer"
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
                        className="text-xs font-medium text-fg-muted hover:underline"
                      >
                        Edit account
                      </Link>
                    ) : (
                      <>
                        <Link
                          href={`/transactions/${t.id}/edit`}
                          className="text-xs font-medium text-fg-muted hover:underline"
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
        </section>
      </div>
    </div>
  );
}
