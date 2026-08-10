import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants/accounts";
import { formatMoney } from "@/lib/services/format";
import { applyDelta, getAccountBalanceDeltas } from "@/lib/services/balance";
import {
  monthLabel,
  monthParamString,
  monthRange,
  parseMonthParam,
  previousMonthEnd,
  shiftMonth,
} from "@/lib/services/calendar";
import { DeleteAccountButton } from "@/components/accounts/DeleteAccountButton";
import { DeleteTransactionButton } from "@/components/transactions/DeleteTransactionButton";
import { ensureMaterialized } from "@/lib/services/recurrence";
import { addToBucket, sortedBuckets, type Bucket } from "@/lib/services/breakdown";
import { CategoryPieChart } from "@/components/charts/CategoryPieChart";

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  await ensureMaterialized(userId);

  const { accountId } = await params;
  const { month } = await searchParams;
  const monthKey = parseMonthParam(month);
  const { start, end } = monthRange(monthKey);
  const periodStartCutoff = previousMonthEnd(monthKey);

  const [account, deltasAtStart, deltasAtEnd, monthTransactions] = await Promise.all([
    prisma.account.findFirst({ where: { id: accountId, userId } }),
    getAccountBalanceDeltas(userId, { asOf: periodStartCutoff }),
    getAccountBalanceDeltas(userId, { asOf: end }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
        OR: [{ accountId }, { fromAccountId: accountId }, { toAccountId: accountId }],
      },
      orderBy: { date: "desc" },
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        tags: { include: { tag: true } },
      },
    }),
  ]);
  if (!account) notFound();

  const carryForward = applyDelta(account.id, deltasAtStart);
  const endingBalance = applyDelta(account.id, deltasAtEnd);
  const owed = Math.max(0, -endingBalance);
  const availableCredit =
    account.type === "CREDIT_CARD" && account.creditLimit
      ? Number(account.creditLimit) - owed
      : null;
  const creditUsedPercent =
    account.type === "CREDIT_CARD" && account.creditLimit && Number(account.creditLimit) > 0
      ? Math.min(100, (owed / Number(account.creditLimit)) * 100)
      : null;

  let income = 0;
  let expense = 0;
  let transferIn = 0;
  let transferOut = 0;
  const incomeByCategory = new Map<string, Bucket>();
  const expenseByCategory = new Map<string, Bucket>();
  const transferInByAccount = new Map<string, Bucket>();
  const transferOutByAccount = new Map<string, Bucket>();

  for (const t of monthTransactions) {
    const amt = Number(t.amount);
    if (t.type === "INCOME") {
      income += amt;
      addToBucket(
        incomeByCategory,
        t.isOpeningBalance ? "opening-balance" : (t.categoryId ?? "uncategorized"),
        t.isOpeningBalance ? "Opening Balance" : (t.category?.name ?? "Uncategorized"),
        t.isOpeningBalance ? "🏦" : (t.category?.icon ?? "❓"),
        amt
      );
    } else if (t.type === "EXPENSE") {
      expense += amt;
      addToBucket(
        expenseByCategory,
        t.isOpeningBalance ? "opening-balance" : (t.categoryId ?? "uncategorized"),
        t.isOpeningBalance ? "Opening Balance" : (t.category?.name ?? "Uncategorized"),
        t.isOpeningBalance ? "🏦" : (t.category?.icon ?? "❓"),
        amt
      );
    } else {
      if (t.toAccountId === accountId) {
        transferIn += amt;
        addToBucket(
          transferInByAccount,
          t.fromAccountId ?? "unknown",
          t.fromAccount?.name ?? "Unknown account",
          t.fromAccount?.icon ?? "🏦",
          amt
        );
      }
      if (t.fromAccountId === accountId) {
        transferOut += amt;
        addToBucket(
          transferOutByAccount,
          t.toAccountId ?? "unknown",
          t.toAccount?.name ?? "Unknown account",
          t.toAccount?.icon ?? "🏦",
          amt
        );
      }
    }
  }

  const totalIn = income + transferIn;
  const totalOut = expense + transferOut;
  const leftToSpend = totalIn - totalOut;
  // Carry Forward counts as available funds alongside this period's inflow —
  // it's money on hand from outside the month boundary, same as income.
  const availableFunds = carryForward + totalIn;
  const percentSpent = availableFunds > 0 ? (totalOut / availableFunds) * 100 : null;

  const cashFlowData = [
    { name: "Income", value: income, color: "#22c55e" },
    { name: "Transfer In", value: transferIn, color: "#3b82f6" },
    { name: "Expense", value: expense, color: "#ef4444" },
    { name: "Transfer Out", value: transferOut, color: "#eab308" },
  ].filter((d) => d.value > 0);

  // For a credit card, "this period's flow" isn't the useful thing to see
  // in the pie — a debt that carries over unpaid into a month with zero new
  // transactions would render as empty, hiding exactly the balance the user
  // cares about. Instead, scale the pie to the credit limit itself: Owed
  // eats into it, payments (which reduce endingBalance's negativity) grow
  // Available back — a gauge, not a flow breakdown, and it's never empty as
  // long as a limit is set.
  const isCreditGauge = account.type === "CREDIT_CARD" && account.creditLimit != null;
  const creditGaugeData = isCreditGauge
    ? [
        { name: "Owed", value: owed, color: "#ef4444" },
        {
          name: "Available Credit",
          value: Math.max(0, Number(account.creditLimit) - owed),
          color: "#7c3aed",
        },
      ].filter((d) => d.value > 0)
    : null;

  const pieData = creditGaugeData ?? cashFlowData;
  const pieCenterLabel = isCreditGauge ? "Available credit" : "Balance available";
  const pieCenterValue = isCreditGauge
    ? formatMoney(availableCredit!, account.currency)
    : formatMoney(endingBalance, account.currency);
  const pieCenterSubtext = isCreditGauge
    ? `${creditUsedPercent!.toFixed(0)}% used`
    : percentSpent !== null
      ? `${percentSpent.toFixed(0)}% spent`
      : undefined;

  const prevMonth = monthParamString(shiftMonth(monthKey, -1));
  const nextMonth = monthParamString(shiftMonth(monthKey, 1));

  return (
    <div className="max-w-md p-6">
      <Link
        href="/accounts"
        className="text-sm font-medium text-zinc-500 hover:underline"
      >
        ← Back to Accounts
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
          style={{ backgroundColor: account.color + "20" }}
        >
          {account.icon}
        </span>
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{account.name}</h1>
          <p className="text-sm text-zinc-500">{ACCOUNT_TYPE_LABELS[account.type]}</p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Link
          href={`/accounts/${account.id}?month=${prevMonth}`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          ← Prev
        </Link>
        <p className="text-sm font-medium text-zinc-900">{monthLabel(monthKey)}</p>
        <Link
          href={`/accounts/${account.id}?month=${nextMonth}`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          Next →
        </Link>
      </div>

      <div className="mt-4">
        <CategoryPieChart
          data={pieData}
          currency={account.currency}
          showDataLabels
          centerLabel={pieCenterLabel}
          centerValue={pieCenterValue}
          centerSubtext={pieCenterSubtext}
        />
      </div>

      {account.type === "CREDIT_CARD" && account.creditLimit && (
        <div className="mt-2 space-y-1 text-sm text-zinc-600">
          <p>Credit limit: {formatMoney(Number(account.creditLimit), account.currency)}</p>
          <p>Available credit: {formatMoney(availableCredit!, account.currency)}</p>
          {owed > Number(account.creditLimit) && (
            <p className="text-xs font-medium text-rose-600">
              Over limit by {formatMoney(owed - Number(account.creditLimit), account.currency)}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-zinc-500">Carry Forward</span>
          <span className="font-medium text-zinc-900">{formatMoney(carryForward, account.currency)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-zinc-500">Total In</span>
          <span className="font-medium text-emerald-700">{formatMoney(totalIn, account.currency)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-zinc-500">Total Out</span>
          <span className="font-medium text-rose-700">{formatMoney(totalOut, account.currency)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-zinc-500">Left to Spend</span>
          <span className={`font-medium ${leftToSpend >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {formatMoney(leftToSpend, account.currency)}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <Link
          href={`/transactions/new?type=INCOME&accountId=${account.id}`}
          className="rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Income
        </Link>
        <Link
          href={`/transactions/new?type=EXPENSE&accountId=${account.id}`}
          className="rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Expense
        </Link>
        <Link
          href={`/transactions/new?type=TRANSFER&accountId=${account.id}`}
          className="rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Transfer
        </Link>
      </div>

      <div className="mt-8 flex gap-2">
        <Link
          href={`/accounts/${account.id}/edit`}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Edit
        </Link>
        <DeleteAccountButton accountId={account.id} />
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Breakdown</h2>
          <Link
            href={`/transactions?accountId=${account.id}`}
            className="text-sm font-medium text-zinc-500 hover:underline"
          >
            Full history
          </Link>
        </div>

        {[
          { title: "Income by category", buckets: sortedBuckets(incomeByCategory), color: "text-emerald-700" },
          { title: "Expense by category", buckets: sortedBuckets(expenseByCategory), color: "text-rose-700" },
          { title: "Transfers in by account", buckets: sortedBuckets(transferInByAccount), color: "text-blue-700" },
          { title: "Transfers out by account", buckets: sortedBuckets(transferOutByAccount), color: "text-amber-700" },
        ]
          .filter((section) => section.buckets.length > 0)
          .map((section) => (
            <div key={section.title} className="mt-4">
              <p className="text-xs font-medium text-zinc-500">{section.title}</p>
              <ul className="mt-1 space-y-1">
                {section.buckets.map((b) => (
                  <li key={b.key} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-700">
                      {b.icon} {b.name}
                    </span>
                    <span className={`font-medium ${section.color}`}>
                      {formatMoney(b.total, account.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-semibold text-zinc-900">
          {monthLabel(monthKey)} transactions
        </h2>

        {monthTransactions.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No transactions this month.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {monthTransactions.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {t.isOpeningBalance
                      ? "🏦 Opening balance"
                      : t.type === "TRANSFER"
                        ? `${t.fromAccount?.name} → ${t.toAccount?.name}`
                        : (t.category?.name ?? "Uncategorized")}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {t.date.toISOString().slice(0, 10)}
                    {t.recurringRuleId ? " · 🔁" : ""}
                  </p>
                  {t.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {t.tags.map(({ tag }) => (
                        <Link
                          key={tag.id}
                          href={`/tags/${encodeURIComponent(tag.name)}`}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200"
                        >
                          🏷️ {tag.name}
                        </Link>
                      ))}
                    </div>
                  )}
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
                    {formatMoney(Number(t.amount), account.currency)}
                  </p>
                  {t.isOpeningBalance ? (
                    <Link
                      href={`/accounts/${account.id}/edit`}
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
                        redirectTo={`/accounts/${account.id}?month=${monthParamString(monthKey)}`}
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
