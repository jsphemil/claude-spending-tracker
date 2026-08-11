import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { AccountForm } from "@/components/accounts/AccountForm";
import { updateAccount } from "@/lib/actions/accounts";

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const { accountId } = await params;
  const [account, profile] = await Promise.all([
    prisma.account.findFirst({ where: { id: accountId, userId } }),
    prisma.profile.findUniqueOrThrow({ where: { id: userId } }),
  ]);
  if (!account) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl p-6 lg:p-10">
      <h1 className="text-xl font-semibold tracking-tight text-fg">Edit {account.name}</h1>
      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <AccountForm
          action={updateAccount.bind(null, account.id)}
          submitLabel="Save changes"
          globalBudgetMode={profile.budgetModeGlobal}
          globalShowFuture={profile.showFutureTransactionsGlobal}
          defaultValues={{
            name: account.name,
            type: account.type,
            color: account.color,
            icon: account.icon,
            currency: account.currency,
            openingBalance: account.openingBalance.toString(),
            openingBalanceDate: account.openingBalanceDate.toISOString().slice(0, 10),
            creditLimit: account.creditLimit?.toString() ?? "",
            budgetModeEnabled: account.budgetModeEnabled === null ? "" : String(account.budgetModeEnabled),
            monthlyBudget: account.monthlyBudget?.toString() ?? "",
            showFutureTransactions:
              account.showFutureTransactions === null ? "" : String(account.showFutureTransactions),
          }}
        />
      </div>
    </div>
  );
}
