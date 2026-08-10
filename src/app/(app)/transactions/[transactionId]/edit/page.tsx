import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { updateTransaction } from "@/lib/actions/transactions";
import { describeSchedule } from "@/lib/services/recurrence";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const { transactionId } = await params;
  const [transaction, accounts, categories, tags] = await Promise.all([
    prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: { recurringRule: true, tags: { include: { tag: true } } },
    }),
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
  if (!transaction) notFound();
  if (transaction.isOpeningBalance) redirect(`/accounts/${transaction.accountId}/edit`);

  const anchorDate = (transaction.occurrenceDate ?? transaction.date).toISOString().slice(0, 10);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-zinc-900">Edit Transaction</h1>
      <div className="mt-6">
        <TransactionForm
          action={updateTransaction.bind(null, transaction.id)}
          accounts={accounts}
          categories={categories}
          existingTagNames={tags.map((t) => t.name)}
          submitLabel="Save changes"
          recurringInfo={
            transaction.recurringRule
              ? {
                  scheduleLabel: describeSchedule(
                    transaction.recurringRule.intervalCount,
                    transaction.recurringRule.intervalUnit
                  ),
                }
              : null
          }
          defaultValues={{
            type: transaction.type,
            amount: transaction.amount.toString(),
            date: anchorDate,
            description: transaction.description ?? "",
            accountId: transaction.accountId ?? "",
            categoryId: transaction.categoryId ?? "",
            fromAccountId: transaction.fromAccountId ?? "",
            toAccountId: transaction.toAccountId ?? "",
            tags: transaction.tags.map((t) => t.tag.name).join(", "),
          }}
        />
      </div>
    </div>
  );
}
