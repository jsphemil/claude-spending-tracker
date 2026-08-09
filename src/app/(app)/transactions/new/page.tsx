import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { createTransaction } from "@/lib/actions/transactions";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; accountId?: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const { type: rawType, accountId } = await searchParams;
  const type = ["INCOME", "EXPENSE", "TRANSFER"].includes(rawType ?? "")
    ? (rawType as "INCOME" | "EXPENSE" | "TRANSFER")
    : "EXPENSE";

  const [accounts, categories] = await Promise.all([
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

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-zinc-900">New Transaction</h1>
      <div className="mt-6">
        <TransactionForm
          action={createTransaction}
          accounts={accounts}
          categories={categories}
          submitLabel="Add transaction"
          defaultValues={{
            type,
            accountId: type !== "TRANSFER" ? accountId : undefined,
            fromAccountId: type === "TRANSFER" ? accountId : undefined,
          }}
        />
      </div>
    </div>
  );
}
