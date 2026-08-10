import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { createTransaction } from "@/lib/actions/transactions";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; accountId?: string; date?: string; duplicateId?: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const { type: rawType, accountId, date, duplicateId } = await searchParams;
  const isValidDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date);

  // Duplicate-last-transaction quick entry: prefill everything from a past
  // transaction except the date, which defaults to today (see
  // TransactionForm's emptyValues) — a duplicate is a new occurrence
  // happening now, not a copy of when the original happened. The
  // opening-balance row is excluded, same as its edit/delete guards.
  const duplicateSource = duplicateId
    ? await prisma.transaction.findFirst({
        where: { id: duplicateId, userId, isOpeningBalance: false },
        include: { tags: { include: { tag: true } } },
      })
    : null;

  const type = duplicateSource
    ? duplicateSource.type
    : ["INCOME", "EXPENSE", "TRANSFER"].includes(rawType ?? "")
      ? (rawType as "INCOME" | "EXPENSE" | "TRANSFER")
      : "EXPENSE";

  const [accounts, categories, tags] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true, currency: true },
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, icon: true, type: true },
    }),
    prisma.tag.findMany({ where: { userId }, orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-fg">New Transaction</h1>
      {duplicateSource && (
        <p className="mt-1 text-sm text-fg-muted">Duplicated from a previous transaction — dated today.</p>
      )}
      <div className="mt-6">
        <TransactionForm
          action={createTransaction}
          accounts={accounts}
          categories={categories}
          existingTagNames={tags.map((t) => t.name)}
          submitLabel="Add transaction"
          allowRecurring
          defaultValues={{
            type,
            amount: duplicateSource ? duplicateSource.amount.toString() : undefined,
            description: duplicateSource?.description ?? undefined,
            accountId: duplicateSource
              ? (duplicateSource.accountId ?? undefined)
              : type !== "TRANSFER"
                ? accountId
                : undefined,
            categoryId: duplicateSource?.categoryId ?? undefined,
            fromAccountId: duplicateSource
              ? (duplicateSource.fromAccountId ?? undefined)
              : type === "TRANSFER"
                ? accountId
                : undefined,
            toAccountId: duplicateSource?.toAccountId ?? undefined,
            tags: duplicateSource ? duplicateSource.tags.map((t) => t.tag.name).join(", ") : undefined,
            date: isValidDate ? date : undefined,
          }}
        />
      </div>
    </div>
  );
}
