import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants/accounts";
import { formatMoney } from "@/lib/services/format";
import { applyDelta, getAccountBalanceDeltas } from "@/lib/services/balance";
import { monthLabel, monthRange, parseMonthParam } from "@/lib/services/calendar";
import { getRegularRingData } from "@/lib/services/ring";
import { BalanceRing } from "@/components/charts/BalanceRing";
import { DeleteTransactionButton } from "@/components/transactions/DeleteTransactionButton";
import { ensureMaterialized } from "@/lib/services/recurrence";

export default async function DashboardPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  await ensureMaterialized(userId);

  // Dashboard always shows the current month (spec 5.8) — month browsing
  // lives on the dedicated Summary page.
  const monthKey = parseMonthParam(undefined);
  const { start, end } = monthRange(monthKey);

  const [accounts, deltas, monthTransactions, recentTransactions] = await Promise.all([
    prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    getAccountBalanceDeltas(userId),
    prisma.transaction.findMany({
      where: { userId, type: { in: ["INCOME", "EXPENSE"] }, date: { gte: start, lte: end } },
      select: { type: true, amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 5,
      include: { account: true, category: true, fromAccount: true, toAccount: true },
    }),
  ]);

  const balances = accounts.map((a) => ({
    account: a,
    balance: applyDelta(Number(a.openingBalance), deltas, a.id),
  }));
  // All accounts are INR-only for now — cross-currency conversion into this
  // total lands in Phase 8.
  const overallBalance = balances.reduce((sum, b) => sum + b.balance, 0);

  const income = monthTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = monthTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const ring = getRegularRingData(income, expense);

  return (
    <div className="max-w-md p-6">
      <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>

      <p className="mt-4 text-sm text-zinc-500">Overall balance</p>
      <p className="text-3xl font-semibold text-zinc-900">{formatMoney(overallBalance, "INR")}</p>

      <div className="mt-6 flex flex-col items-center">
        <BalanceRing
          lap1Percent={ring.lap1Percent}
          lap2Percent={ring.lap2Percent}
          isOverLimit={ring.isOverLimit}
          centerLabel={monthLabel(monthKey)}
          centerValue={formatMoney(expense, "INR")}
        />
        <div className="mt-3 flex gap-6 text-sm">
          <div>
            <span className="text-zinc-500">Income </span>
            <span className="font-medium text-emerald-700">{formatMoney(income, "INR")}</span>
          </div>
          <div>
            <span className="text-zinc-500">Expense </span>
            <span className="font-medium text-rose-700">{formatMoney(expense, "INR")}</span>
          </div>
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
