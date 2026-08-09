import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants/accounts";
import { formatMoney } from "@/lib/services/format";
import { applyDelta, getAccountBalanceDeltas } from "@/lib/services/balance";
import { DeleteAccountButton } from "@/components/accounts/DeleteAccountButton";
import { DeleteTransactionButton } from "@/components/transactions/DeleteTransactionButton";
import { ensureMaterialized } from "@/lib/services/recurrence";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  await ensureMaterialized(userId);

  const { accountId } = await params;
  const [account, deltas, transactions] = await Promise.all([
    prisma.account.findFirst({ where: { id: accountId, userId } }),
    getAccountBalanceDeltas(userId),
    prisma.transaction.findMany({
      where: {
        userId,
        OR: [{ accountId }, { fromAccountId: accountId }, { toAccountId: accountId }],
      },
      orderBy: { date: "desc" },
      take: 20,
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        tags: { include: { tag: true } },
      },
    }),
  ]);
  if (!account) notFound();

  const balance = applyDelta(Number(account.openingBalance), deltas, account.id);
  const availableCredit =
    account.type === "CREDIT_CARD" && account.creditLimit
      ? Number(account.creditLimit) - Math.max(0, -balance)
      : null;

  return (
    <div className="max-w-md p-6">
      <div className="flex items-center gap-3">
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

      <p className="mt-6 text-3xl font-semibold text-zinc-900">
        {formatMoney(balance, account.currency)}
      </p>

      {account.type === "CREDIT_CARD" && account.creditLimit && (
        <div className="mt-2 space-y-1 text-sm text-zinc-600">
          <p>Credit limit: {formatMoney(Number(account.creditLimit), account.currency)}</p>
          <p>Available credit: {formatMoney(availableCredit!, account.currency)}</p>
        </div>
      )}

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
          <h2 className="text-sm font-semibold text-zinc-900">Recent transactions</h2>
          <Link
            href={`/transactions?accountId=${account.id}`}
            className="text-sm font-medium text-zinc-500 hover:underline"
          >
            View all
          </Link>
        </div>

        {transactions.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No transactions yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {transactions.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {t.type === "TRANSFER"
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
                  <Link
                    href={`/transactions/${t.id}/edit`}
                    className="text-xs font-medium text-zinc-500 hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteTransactionButton
                    transactionId={t.id}
                    redirectTo={`/accounts/${account.id}`}
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
