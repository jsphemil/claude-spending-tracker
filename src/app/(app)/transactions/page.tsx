import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/services/format";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { SummaryBand } from "@/components/transactions/SummaryBand";
import { DeleteTransactionButton } from "@/components/transactions/DeleteTransactionButton";
import { ensureMaterialized } from "@/lib/services/recurrence";
import type { Prisma } from "@/generated/prisma/client";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    accountId?: string;
    categoryId?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  await ensureMaterialized(userId);

  const { accountId, categoryId, from, to } = await searchParams;

  const where: Prisma.TransactionWhereInput = { userId };
  if (accountId) {
    where.OR = [{ accountId }, { fromAccountId: accountId }, { toAccountId: accountId }];
  }
  if (categoryId) where.categoryId = categoryId;
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [accounts, categories, transactions, sums, filteredAccount] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true, currency: true },
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, icon: true },
    }),
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      include: { account: true, category: true, fromAccount: true, toAccount: true },
    }),
    prisma.transaction.groupBy({ by: ["type"], where, _sum: { amount: true } }),
    accountId
      ? prisma.account.findFirst({ where: { id: accountId, userId }, select: { currency: true } })
      : null,
  ]);

  const income = Number(sums.find((s) => s.type === "INCOME")?._sum.amount ?? 0);
  const expense = Number(sums.find((s) => s.type === "EXPENSE")?._sum.amount ?? 0);
  const currency = filteredAccount?.currency ?? "INR";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Transactions</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/transactions/calendar"
            className="text-sm font-medium text-zinc-500 hover:underline"
          >
            Calendar
          </Link>
          <Link
            href="/transactions/new"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            + New Transaction
          </Link>
        </div>
      </div>

      <div className="mt-4">
        <TransactionFilters accounts={accounts} categories={categories} />
      </div>

      <div className="mt-4">
        <SummaryBand income={income} expense={expense} currency={currency} />
      </div>

      {transactions.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600">No transactions match this filter.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {transactions.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                  style={{
                    backgroundColor:
                      (t.type === "TRANSFER" ? "#3b82f6" : t.category?.color ?? "#71717a") + "20",
                  }}
                >
                  {t.type === "TRANSFER" ? "🔁" : t.category?.icon ?? "❓"}
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {t.type === "TRANSFER"
                      ? `${t.fromAccount?.name} → ${t.toAccount?.name}`
                      : `${t.category?.name ?? "Uncategorized"} · ${t.account?.name}`}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {t.date.toISOString().slice(0, 10)}
                    {t.description ? ` · ${t.description}` : ""}
                    {t.recurringRuleId ? " · 🔁" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
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
                  className="text-sm font-medium text-zinc-700 hover:underline"
                >
                  Edit
                </Link>
                <DeleteTransactionButton
                  transactionId={t.id}
                  redirectTo="/transactions"
                  isRecurring={!!t.recurringRuleId}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
