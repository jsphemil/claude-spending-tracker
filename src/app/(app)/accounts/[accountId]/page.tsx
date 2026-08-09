import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants/accounts";
import { formatMoney } from "@/lib/services/format";
import { DeleteAccountButton } from "@/components/accounts/DeleteAccountButton";

export default async function AccountDetailPage({
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

  const balance = Number(account.openingBalance);
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
        <button
          type="button"
          disabled
          title="Available once transactions ship in Phase 3"
          className="cursor-not-allowed rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-400"
        >
          Income
        </button>
        <button
          type="button"
          disabled
          title="Available once transactions ship in Phase 3"
          className="cursor-not-allowed rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-400"
        >
          Expense
        </button>
        <button
          type="button"
          disabled
          title="Available once transactions ship in Phase 3"
          className="cursor-not-allowed rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-400"
        >
          Transfer
        </button>
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
    </div>
  );
}
