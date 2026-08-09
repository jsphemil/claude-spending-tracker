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
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) notFound();

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-zinc-900">Edit {account.name}</h1>
      <div className="mt-6">
        <AccountForm
          action={updateAccount.bind(null, account.id)}
          submitLabel="Save changes"
          defaultValues={{
            name: account.name,
            type: account.type,
            color: account.color,
            icon: account.icon,
            currency: account.currency,
            openingBalance: account.openingBalance.toString(),
            openingBalanceDate: account.openingBalanceDate.toISOString().slice(0, 10),
            creditLimit: account.creditLimit?.toString() ?? "",
          }}
        />
      </div>
    </div>
  );
}
