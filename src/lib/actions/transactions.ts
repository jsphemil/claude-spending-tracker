"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { parseTransactionFormData, type TransactionInput } from "@/lib/validation/transaction";

export type TransactionActionState = { error: string | null };

async function validateReferences(userId: string, data: TransactionInput): Promise<string | null> {
  if (data.type === "TRANSFER") {
    const accounts = await prisma.account.findMany({
      where: { id: { in: [data.fromAccountId, data.toAccountId] }, userId },
      select: { id: true },
    });
    if (accounts.length !== 2) return "One or both accounts were not found";
    return null;
  }

  const [account, category] = await Promise.all([
    prisma.account.findFirst({ where: { id: data.accountId, userId }, select: { id: true } }),
    prisma.category.findFirst({ where: { id: data.categoryId, userId }, select: { type: true } }),
  ]);
  if (!account) return "Account not found";
  if (!category) return "Category not found";
  if (category.type !== data.type) return "That category doesn't match this transaction type";
  return null;
}

export async function createTransaction(
  _prevState: TransactionActionState,
  formData: FormData
): Promise<TransactionActionState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const parsed = parseTransactionFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const refError = await validateReferences(userId, parsed.data);
  if (refError) return { error: refError };

  let redirectAccountId: string;
  if (parsed.data.type === "TRANSFER") {
    const { type, amount, date, description, fromAccountId, toAccountId } = parsed.data;
    await prisma.transaction.create({
      data: { userId, type, amount, date, description, fromAccountId, toAccountId },
    });
    redirectAccountId = fromAccountId;
  } else {
    const { type, amount, date, description, accountId, categoryId } = parsed.data;
    await prisma.transaction.create({
      data: { userId, type, amount, date, description, accountId, categoryId },
    });
    redirectAccountId = accountId;
  }

  redirect(`/accounts/${redirectAccountId}`);
}

export async function updateTransaction(
  transactionId: string,
  _prevState: TransactionActionState,
  formData: FormData
): Promise<TransactionActionState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const existing = await prisma.transaction.findFirst({ where: { id: transactionId, userId } });
  if (!existing) return { error: "Transaction not found" };

  const parsed = parseTransactionFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const refError = await validateReferences(userId, parsed.data);
  if (refError) return { error: refError };

  let redirectAccountId: string;
  if (parsed.data.type === "TRANSFER") {
    const { type, amount, date, description, fromAccountId, toAccountId } = parsed.data;
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        type,
        amount,
        date,
        description,
        fromAccountId,
        toAccountId,
        accountId: null,
        categoryId: null,
      },
    });
    redirectAccountId = fromAccountId;
  } else {
    const { type, amount, date, description, accountId, categoryId } = parsed.data;
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        type,
        amount,
        date,
        description,
        accountId,
        categoryId,
        fromAccountId: null,
        toAccountId: null,
      },
    });
    redirectAccountId = accountId;
  }

  redirect(`/accounts/${redirectAccountId}`);
}

export async function deleteTransaction(transactionId: string, redirectTo: string) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  await prisma.transaction.deleteMany({ where: { id: transactionId, userId } });

  redirect(redirectTo);
}
