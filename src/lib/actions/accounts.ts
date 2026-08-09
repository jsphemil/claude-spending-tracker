"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { parseAccountFormData } from "@/lib/validation/account";

export type AccountActionState = { error: string | null };

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

  const account = await prisma.account.create({
    data: { ...parsed.data, userId },
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

  redirect(`/accounts/${accountId}`);
}

export async function deleteAccount(accountId: string) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  await prisma.account.deleteMany({ where: { id: accountId, userId } });

  redirect("/accounts");
}
