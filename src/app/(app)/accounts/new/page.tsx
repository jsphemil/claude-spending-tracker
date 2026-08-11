import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { AccountForm } from "@/components/accounts/AccountForm";
import { createAccount } from "@/lib/actions/accounts";

export default async function NewAccountPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: userId } });

  return (
    <div className="mx-auto w-full max-w-2xl p-6 lg:p-10">
      <h1 className="text-xl font-semibold tracking-tight text-fg">New Account</h1>
      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <AccountForm
          action={createAccount}
          submitLabel="Create account"
          globalBudgetMode={profile.budgetModeGlobal}
          globalShowFuture={profile.showFutureTransactionsGlobal}
        />
      </div>
    </div>
  );
}
