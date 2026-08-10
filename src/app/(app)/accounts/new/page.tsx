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
    <div className="p-6">
      <h1 className="text-xl font-semibold text-zinc-900">New Account</h1>
      <div className="mt-6">
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
