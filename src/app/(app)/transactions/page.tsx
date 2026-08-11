import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/services/format";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { SummaryBand } from "@/components/transactions/SummaryBand";
import { DeleteTransactionButton } from "@/components/transactions/DeleteTransactionButton";
import { EditIcon, DuplicateIcon, actionIconButton } from "@/components/transactions/action-icons";
import { ensureMaterialized } from "@/lib/services/recurrence";
import { monthRange, parseMonthParam, toDateKey } from "@/lib/services/calendar";
import type { Prisma } from "@/generated/prisma/client";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    accountId?: string;
    categoryId?: string;
    type?: string;
    from?: string;
    to?: string;
    all?: string;
  }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const { accountId, categoryId, type: rawType, from, to, all } = await searchParams;
  const type = rawType === "INCOME" || rawType === "EXPENSE" || rawType === "TRANSFER" ? rawType : undefined;

  // Default to the current month so a fresh visit doesn't dump the entire
  // transaction history (including future-materialized recurring rows) —
  // still fully overridable via the date filters below, or via "all" for
  // an explicit all-time view (see TransactionFilters' Clear button).
  if (!from && !to && !all) {
    const { start, end } = monthRange(parseMonthParam(undefined));
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    if (categoryId) params.set("categoryId", categoryId);
    if (type) params.set("type", type);
    params.set("from", toDateKey(start));
    params.set("to", toDateKey(end));
    redirect(`/transactions?${params.toString()}`);
  }

  // A browsed "to" filter needs materialization extended out to cover it,
  // same as any other month-scoped page — otherwise an indefinite recurring
  // rule stops appearing past today+3 months even when explicitly filtered
  // further out.
  await ensureMaterialized(userId, { through: to ? new Date(to) : undefined });

  const where: Prisma.TransactionWhereInput = { userId };
  if (accountId) {
    where.OR = [{ accountId }, { fromAccountId: accountId }, { toAccountId: accountId }];
  }
  if (categoryId) where.categoryId = categoryId;
  if (type) where.type = type;
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
      include: {
        account: true,
        category: true,
        fromAccount: true,
        toAccount: true,
        tags: { include: { tag: true } },
      },
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
    <div className="mx-auto w-full max-w-[1400px] p-6 lg:p-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight text-fg">Transactions</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/transactions/calendar"
            className="text-sm font-medium text-fg-muted hover:underline"
          >
            Calendar
          </Link>
          <Link
            href="/transactions/new"
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-strong"
          >
            + New Transaction
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <TransactionFilters accounts={accounts} categories={categories} />

        <div className="mt-4">
          <SummaryBand income={income} expense={expense} currency={currency} />
        </div>

        {transactions.length === 0 ? (
          <p className="mt-6 text-sm text-fg-muted">No transactions match this filter.</p>
        ) : (
          <ul className="mt-4">
            {transactions.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 border-t border-border py-3 first:border-t-0"
              >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
                  style={{
                    backgroundColor:
                      (t.isOpeningBalance
                        ? "#7c3aed"
                        : t.type === "TRANSFER"
                          ? "#eab308"
                          : t.category?.color ?? "#71717a") + "20",
                  }}
                >
                  {t.isOpeningBalance ? "🏦" : t.type === "TRANSFER" ? "🔁" : t.category?.icon ?? "❓"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">
                    {t.isOpeningBalance
                      ? `Opening balance · ${t.account?.name}`
                      : t.type === "TRANSFER"
                        ? `${t.fromAccount?.name} → ${t.toAccount?.name}`
                        : `${t.category?.name ?? "Uncategorized"} · ${t.account?.name}`}
                  </p>
                  <p className="truncate text-xs text-fg-muted">
                    {t.date.toISOString().slice(0, 10)}
                    {t.description ? ` · ${t.description}` : ""}
                    {t.recurringRuleId ? " · 🔁" : ""}
                  </p>
                  {t.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {t.tags.map(({ tag }) => (
                        <Link
                          key={tag.id}
                          href={`/tags/${encodeURIComponent(tag.name)}`}
                          className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg-muted hover:bg-surface-3"
                        >
                          🏷️ {tag.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p
                    className={`font-data text-sm font-medium tabular-nums ${
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
                      title="Edit account"
                      aria-label="Edit account"
                      className={actionIconButton}
                    >
                      <EditIcon />
                    </Link>
                  ) : (
                    <>
                      <Link
                        href={`/transactions/new?duplicateId=${t.id}`}
                        title="Duplicate"
                        aria-label="Duplicate transaction"
                        className={actionIconButton}
                      >
                        <DuplicateIcon />
                      </Link>
                      <Link
                        href={`/transactions/${t.id}/edit`}
                        title="Edit"
                        aria-label="Edit transaction"
                        className={actionIconButton}
                      >
                        <EditIcon />
                      </Link>
                      <DeleteTransactionButton
                        transactionId={t.id}
                        redirectTo="/transactions"
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
