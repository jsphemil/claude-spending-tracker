import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants/accounts";
import { formatMoney } from "@/lib/services/format";
import { applyDelta, getAccountBalanceDeltas } from "@/lib/services/balance";

export default async function AccountsPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const [accounts, deltas] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    getAccountBalanceDeltas(userId),
  ]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Accounts</h1>
        <Link
          href="/accounts/new"
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + New Account
        </Link>
      </div>

      {accounts.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600">
          No accounts yet. Create your first one to get started.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {accounts.map((account) => (
            <li key={account.id}>
              <Link
                href={`/accounts/${account.id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                    style={{ backgroundColor: account.color + "20" }}
                  >
                    {account.icon}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{account.name}</p>
                    <p className="text-xs text-zinc-500">
                      {ACCOUNT_TYPE_LABELS[account.type]}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium text-zinc-900">
                  {formatMoney(
                    applyDelta(Number(account.openingBalance), deltas, account.id),
                    account.currency
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
