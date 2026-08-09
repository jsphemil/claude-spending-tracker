import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { updateTransaction } from "@/lib/actions/transactions";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const { transactionId } = await params;
  const [transaction, accounts, categories] = await Promise.all([
    prisma.transaction.findFirst({ where: { id: transactionId, userId } }),
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
  ]);
  if (!transaction) notFound();

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-zinc-900">Edit Transaction</h1>
      <div className="mt-6">
        <TransactionForm
          action={updateTransaction.bind(null, transaction.id)}
          accounts={accounts}
          categories={categories}
          submitLabel="Save changes"
          defaultValues={{
            type: transaction.type,
            amount: transaction.amount.toString(),
            date: transaction.date.toISOString().slice(0, 10),
            description: transaction.description ?? "",
            accountId: transaction.accountId ?? "",
            categoryId: transaction.categoryId ?? "",
            fromAccountId: transaction.fromAccountId ?? "",
            toAccountId: transaction.toAccountId ?? "",
          }}
        />
      </div>
    </div>
  );
}
