"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { parseAccountFormData } from "@/lib/validation/account";

export type AccountActionState = { error: string | null };

// Keeps the system-generated opening-balance Transaction row (see schema
// comment on Transaction.isOpeningBalance) in sync with the account's
// openingBalance/openingBalanceDate fields, so every ledger query picks it
// up automatically instead of every page having to special-case it.
//
// Deliberately sequential (not wrapped in prisma.$transaction) — Supabase's
// pooled connection runs pgbouncer in transaction mode, which can't reliably
// hand Prisma's interactive transactions a pinned session, and it times out
// (P2028) rather than committing. A momentary gap between the account write
// and this one is an acceptable tradeoff for a single-user app.
async function syncOpeningBalanceTransaction(
  userId: string,
  account: { id: string; openingBalance: number; openingBalanceDate: Date }
) {
  const amount = account.openingBalance;
  const existing = await prisma.transaction.findFirst({
    where: { accountId: account.id, userId, isOpeningBalance: true },
  });

  if (amount === 0) {
    if (existing) await prisma.transaction.delete({ where: { id: existing.id } });
    return;
  }

  const data = {
    type: amount >= 0 ? ("INCOME" as const) : ("EXPENSE" as const),
    amount: Math.abs(amount),
    date: account.openingBalanceDate,
  };

  if (existing) {
    await prisma.transaction.update({ where: { id: existing.id }, data });
  } else {
    await prisma.transaction.create({
      data: { ...data, userId, accountId: account.id, isOpeningBalance: true },
    });
  }
}

export async function createAccount(
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const parsed = parseAccountFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const account = await prisma.account.create({ data: { ...parsed.data, userId } });
  await syncOpeningBalanceTransaction(userId, {
    id: account.id,
    openingBalance: Number(account.openingBalance),
    openingBalanceDate: account.openingBalanceDate,
  });

  redirect(`/accounts/${account.id}`);
}

export async function updateAccount(
  accountId: string,
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const parsed = parseAccountFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await prisma.account.updateMany({
    where: { id: accountId, userId },
    data: parsed.data,
  });

  if (result.count === 0) {
    return { error: "Account not found" };
  }

  await syncOpeningBalanceTransaction(userId, {
    id: accountId,
    openingBalance: parsed.data.openingBalance,
    openingBalanceDate: parsed.data.openingBalanceDate,
  });

  redirect(`/accounts/${accountId}`);
}

export async function deleteAccount(
  accountId: string,
  _prevState: AccountActionState,
  _formData: FormData
): Promise<AccountActionState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const [inUseCount, activeRuleCount] = await Promise.all([
    prisma.transaction.count({
      where: {
        userId,
        // The opening-balance row doesn't count as "in use" — it's account
        // metadata, not real activity, and gets cleaned up below alongside
        // the account itself.
        isOpeningBalance: false,
        OR: [{ accountId }, { fromAccountId: accountId }, { toAccountId: accountId }],
      },
    }),
    prisma.recurringRule.count({
      where: {
        userId,
        // Even a closed rule (isActive: false) still holds a foreign key to
        // this account — the DB relation is onDelete: Restrict on purpose,
        // so this check has to match that, not just count active rules.
        OR: [{ accountId }, { fromAccountId: accountId }, { toAccountId: accountId }],
      },
    }),
  ]);
  if (inUseCount > 0) {
    return {
      error: `This account has ${inUseCount} transaction${inUseCount === 1 ? "" : "s"} — delete or move them first.`,
    };
  }
  if (activeRuleCount > 0) {
    return {
      error: `This account has ${activeRuleCount} recurring rule${activeRuleCount === 1 ? "" : "s"} in its history (active or stopped) — this account can't be deleted while that history exists.`,
    };
  }

  // The account's own opening-balance row would otherwise block deletion via
  // the FK (Transaction.account is onDelete: Restrict) — it's not "in use"
  // in the sense checked above, but it still has to go first.
  await prisma.transaction.deleteMany({ where: { accountId, userId, isOpeningBalance: true } });
  await prisma.account.deleteMany({ where: { id: accountId, userId } });

  redirect("/accounts");
}
