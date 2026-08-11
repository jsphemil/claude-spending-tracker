"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { parseTransactionFormData, type TransactionInput } from "@/lib/validation/transaction";
import { parseEndDateFormData, parseRecurringScheduleFormData } from "@/lib/validation/recurring";
import {
  createRecurringSeries,
  deleteFutureOccurrences,
  deleteSingleOccurrence,
  editFutureOccurrences,
  editSingleOccurrence,
} from "@/lib/services/recurrence";
import { parseTagInput, resolveTagIds, syncTransactionTags } from "@/lib/services/tags";

export type TransactionActionState = { error: string | null; success?: boolean };

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

  const tagNames = parseTagInput(formData.get("tags"));
  const tagIds = await resolveTagIds(userId, tagNames);

  if (formData.get("recurring") === "on") {
    const scheduleParsed = parseRecurringScheduleFormData(formData);
    if (!scheduleParsed.success) {
      return { error: scheduleParsed.error.issues[0]?.message ?? "Invalid schedule" };
    }
    const redirectAccountId = await createRecurringSeries(
      userId,
      parsed.data,
      {
        intervalCount: scheduleParsed.data.intervalCount,
        intervalUnit: scheduleParsed.data.intervalUnit,
        endDate: scheduleParsed.data.endDate ?? null,
      },
      tagIds
    );
    redirect(`/accounts/${redirectAccountId}`);
  }

  let redirectAccountId: string;
  let createdId: string;
  if (parsed.data.type === "TRANSFER") {
    const { type, amount, date, description, fromAccountId, toAccountId } = parsed.data;
    const created = await prisma.transaction.create({
      data: { userId, type, amount, date, description, fromAccountId, toAccountId },
    });
    createdId = created.id;
    redirectAccountId = fromAccountId;
  } else {
    const { type, amount, date, description, accountId, categoryId } = parsed.data;
    const created = await prisma.transaction.create({
      data: { userId, type, amount, date, description, accountId, categoryId },
    });
    createdId = created.id;
    redirectAccountId = accountId;
  }

  if (tagIds.length > 0) {
    await syncTransactionTags(createdId, tagIds);
  }

  redirect(`/accounts/${redirectAccountId}`);
}

// Same creation path as createTransaction, minus recurring support and the
// redirect-to-account-page finish — used by the Quick Add floating button,
// which opens as a modal over whatever page you're already on and should
// leave you there, not navigate away. Recurring setup stays on the full
// New Transaction page since "quick" is the whole point of this entry point.
export async function quickAddTransaction(
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

  const tagNames = parseTagInput(formData.get("tags"));
  const tagIds = await resolveTagIds(userId, tagNames);

  let createdId: string;
  if (parsed.data.type === "TRANSFER") {
    const { type, amount, date, description, fromAccountId, toAccountId } = parsed.data;
    const created = await prisma.transaction.create({
      data: { userId, type, amount, date, description, fromAccountId, toAccountId },
    });
    createdId = created.id;
  } else {
    const { type, amount, date, description, accountId, categoryId } = parsed.data;
    const created = await prisma.transaction.create({
      data: { userId, type, amount, date, description, accountId, categoryId },
    });
    createdId = created.id;
  }

  if (tagIds.length > 0) {
    await syncTransactionTags(createdId, tagIds);
  }

  return { error: null, success: true };
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
  if (existing.isOpeningBalance) {
    return { error: "Edit the opening balance from the account's own edit page instead." };
  }

  const parsed = parseTransactionFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const refError = await validateReferences(userId, parsed.data);
  if (refError) return { error: refError };

  const tagNames = parseTagInput(formData.get("tags"));
  const tagIds = await resolveTagIds(userId, tagNames);

  if (existing.recurringRuleId && existing.occurrenceDate) {
    const scope = formData.get("scope");
    if (scope !== "ONE" && scope !== "FUTURE") {
      return { error: "Choose whether to change just this occurrence or this and all future ones." };
    }
    const ref = {
      id: existing.id,
      recurringRuleId: existing.recurringRuleId,
      occurrenceDate: existing.occurrenceDate,
    };
    let redirectAccountId: string;
    if (scope === "ONE") {
      redirectAccountId = await editSingleOccurrence(ref, parsed.data, tagIds);
    } else {
      const endDateParsed = parseEndDateFormData(formData);
      if (!endDateParsed.success) return { error: "Invalid end date" };
      redirectAccountId = await editFutureOccurrences(
        userId,
        ref,
        parsed.data,
        tagIds,
        endDateParsed.data
      );
    }
    redirect(`/accounts/${redirectAccountId}`);
  }

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

  await syncTransactionTags(transactionId, tagIds);

  redirect(`/accounts/${redirectAccountId}`);
}

export async function deleteTransaction(transactionId: string, redirectTo: string, formData: FormData) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const existing = await prisma.transaction.findFirst({ where: { id: transactionId, userId } });
  if (!existing) redirect(redirectTo);
  // Not deletable directly — it's kept in sync with the account's own
  // openingBalance field (see lib/actions/accounts.ts). The UI doesn't
  // render a delete control for these rows; this is a server-side backstop.
  if (existing.isOpeningBalance) redirect(redirectTo);

  if (existing.recurringRuleId && existing.occurrenceDate) {
    const scope = formData.get("scope");
    const ref = {
      id: existing.id,
      recurringRuleId: existing.recurringRuleId,
      occurrenceDate: existing.occurrenceDate,
    };
    if (scope === "ONE") {
      await deleteSingleOccurrence(ref);
    } else if (scope === "FUTURE") {
      await deleteFutureOccurrences(userId, ref);
    }
  } else {
    await prisma.transaction.deleteMany({ where: { id: transactionId, userId } });
  }

  redirect(redirectTo);
}
