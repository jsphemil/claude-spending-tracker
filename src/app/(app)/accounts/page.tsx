import Link from "next/link";
import { redirect } from "next/navigation";
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
  shiftMonth,
} from "@/lib/services/calendar";
import { ensureMaterialized } from "@/lib/services/recurrence";

type AccountFlow = { income: number; expense: number; transferIn: number; transferOut: number };

export default async function AccountsPage({
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

  const [accounts, deltasAtEnd, periodTransactions] = await Promise.all([
    prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    getAccountBalanceDeltas(userId, { asOf: end }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { type: true, amount: true, accountId: true, fromAccountId: true, toAccountId: true },
    }),
  ]);

  const flowByAccount = new Map<string, AccountFlow>();
  const getFlow = (id: string) => {
    let f = flowByAccount.get(id);
    if (!f) {
      f = { income: 0, expense: 0, transferIn: 0, transferOut: 0 };
      flowByAccount.set(id, f);
    }
    return f;
  };
  for (const t of periodTransactions) {
    const amt = Number(t.amount);
    if (t.type === "INCOME" && t.accountId) getFlow(t.accountId).income += amt;
    else if (t.type === "EXPENSE" && t.accountId) getFlow(t.accountId).expense += amt;
    else if (t.type === "TRANSFER") {
      if (t.fromAccountId) getFlow(t.fromAccountId).transferOut += amt;
      if (t.toAccountId) getFlow(t.toAccountId).transferIn += amt;
    }
  }

  const rows = accounts.map((account) => {
    const flow = getFlow(account.id);
    return {
      account,
      income: flow.income,
      expense: flow.expense,
      netTransfer: flow.transferIn - flow.transferOut,
      balance: applyDelta(account.id, deltasAtEnd),
    };
  });

  const prevMonth = monthParamString(shiftMonth(monthKey, -1));
  const nextMonth = monthParamString(shiftMonth(monthKey, 1));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Accounts</h1>
        <Link
          href="/accounts/new"
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + New Account
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Link
          href={`/accounts?month=${prevMonth}`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          ← Prev
        </Link>
        <p className="text-sm font-medium text-zinc-900">{monthLabel(monthKey)}</p>
        <Link
          href={`/accounts?month=${nextMonth}`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          Next →
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600">
          No accounts yet. Create your first one to get started.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map(({ account, income, expense, netTransfer, balance }) => (
            <li key={account.id}>
              <Link
                href={`/accounts/${account.id}?month=${monthParamString(monthKey)}`}
                className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300"
              >
                <div className="flex items-center justify-between">
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
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-zinc-500">Income</p>
                    <p className="font-medium text-emerald-700">{formatMoney(income, account.currency)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Expense</p>
                    <p className="font-medium text-rose-700">{formatMoney(expense, account.currency)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Transfers</p>
                    <p
                      className={`font-medium ${netTransfer >= 0 ? "text-blue-700" : "text-amber-700"}`}
                    >
                      {netTransfer >= 0 ? "+" : ""}
                      {formatMoney(netTransfer, account.currency)}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
