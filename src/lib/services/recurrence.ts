import { prisma } from "@/lib/db/prisma";
import type { RecurrenceUnit, RecurringRule } from "@/generated/prisma/client";
import type { TransactionInput } from "@/lib/validation/transaction";

// Real Transaction rows are materialized up to a rolling horizon rather than
// generated infinitely ahead (indefinite rules have no end date) or computed
// virtually at read time (occurrences need a stable id to be individually
// edited/deleted). See build plan 1.6.
const HORIZON_MONTHS = 3;

// All UTC-based — see the same rationale in lib/services/calendar.ts.
function addIntervalUTC(date: Date, count: number, unit: RecurrenceUnit): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  switch (unit) {
    case "DAY":
      return new Date(Date.UTC(y, m, d + count));
    case "WEEK":
      return new Date(Date.UTC(y, m, d + count * 7));
    case "MONTH":
      return new Date(Date.UTC(y, m + count, d));
    case "YEAR":
      return new Date(Date.UTC(y + count, m, d));
  }
}

function subDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 1));
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function horizonDate(): Date {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + HORIZON_MONTHS, today.getUTCDate()));
}

function buildOccurrenceData(rule: RecurringRule, occurrenceDate: Date) {
  return {
    userId: rule.userId,
    type: rule.type,
    amount: rule.amount,
    date: occurrenceDate,
    description: rule.description,
    accountId: rule.accountId,
    fromAccountId: rule.fromAccountId,
    toAccountId: rule.toAccountId,
    categoryId: rule.categoryId,
    recurringRuleId: rule.id,
    occurrenceDate,
    isRecurringGenerated: true,
  };
}

// Idempotent and safe to call repeatedly: skips dates already covered by an
// exception, and createMany's skipDuplicates (backed by the
// (recurringRuleId, occurrenceDate) unique index) protects against
// re-materializing a date twice even under concurrent calls.
async function materializeRule(rule: RecurringRule): Promise<void> {
  const horizon = horizonDate();
  const effectiveEnd = rule.endDate && rule.endDate < horizon ? rule.endDate : horizon;
  if (effectiveEnd < rule.startDate) return;

  let cursor = rule.lastGeneratedDate
    ? addIntervalUTC(rule.lastGeneratedDate, rule.intervalCount, rule.intervalUnit)
    : rule.startDate;
  if (cursor > effectiveEnd) return;

  const exceptions = await prisma.recurringException.findMany({
    where: { recurringRuleId: rule.id, occurrenceDate: { gte: cursor, lte: effectiveEnd } },
    select: { occurrenceDate: true },
  });
  const exceptionDates = new Set(exceptions.map((e) => toDateKey(e.occurrenceDate)));

  const occurrences: Date[] = [];
  while (cursor <= effectiveEnd) {
    if (!exceptionDates.has(toDateKey(cursor))) occurrences.push(cursor);
    cursor = addIntervalUTC(cursor, rule.intervalCount, rule.intervalUnit);
  }

  if (occurrences.length === 0) {
    await prisma.recurringRule.update({ where: { id: rule.id }, data: { lastGeneratedDate: effectiveEnd } });
    return;
  }

  await prisma.transaction.createMany({
    data: occurrences.map((d) => buildOccurrenceData(rule, d)),
    skipDuplicates: true,
  });
  await prisma.recurringRule.update({
    where: { id: rule.id },
    data: { lastGeneratedDate: occurrences[occurrences.length - 1] },
  });
}

// Primary materialization mechanism — call at the top of any page that reads
// transaction data. The daily cron (/api/cron/materialize-recurring) is only
// a backstop for when nobody visits the app.
export async function ensureMaterialized(userId: string): Promise<void> {
  const horizon = horizonDate();
  const rules = await prisma.recurringRule.findMany({
    where: { userId, isActive: true, startDate: { lte: horizon } },
  });
  for (const rule of rules) {
    await materializeRule(rule);
  }
}

export async function ensureMaterializedForAllUsers(): Promise<void> {
  const rows = await prisma.recurringRule.findMany({
    where: { isActive: true },
    select: { userId: true },
    distinct: ["userId"],
  });
  for (const { userId } of rows) {
    await ensureMaterialized(userId);
  }
}

function accountFields(values: TransactionInput) {
  return values.type === "TRANSFER"
    ? {
        accountId: null,
        categoryId: null,
        fromAccountId: values.fromAccountId,
        toAccountId: values.toAccountId,
      }
    : {
        accountId: values.accountId,
        categoryId: values.categoryId,
        fromAccountId: null,
        toAccountId: null,
      };
}

function redirectAccountId(values: TransactionInput): string {
  return values.type === "TRANSFER" ? values.fromAccountId : values.accountId;
}

export async function createRecurringSeries(
  userId: string,
  values: TransactionInput,
  schedule: { intervalCount: number; intervalUnit: RecurrenceUnit; endDate: Date | null }
): Promise<string> {
  const rule = await prisma.recurringRule.create({
    data: {
      userId,
      type: values.type,
      amount: values.amount,
      description: values.description,
      ...accountFields(values),
      intervalCount: schedule.intervalCount,
      intervalUnit: schedule.intervalUnit,
      startDate: values.date,
      endDate: schedule.endDate,
    },
  });

  await materializeRule(rule);

  return redirectAccountId(values);
}

type RecurringTransactionRef = { id: string; recurringRuleId: string; occurrenceDate: Date };

// "Just this one" edit: the date field is locked to occurrenceDate in the UI
// (see TransactionForm), so there's no divergence to reconcile here — only
// amount/account/category/description can change per occurrence.
export async function editSingleOccurrence(
  existing: RecurringTransactionRef,
  values: TransactionInput
): Promise<string> {
  await prisma.$transaction([
    prisma.transaction.update({
      where: { id: existing.id },
      data: {
        type: values.type,
        amount: values.amount,
        description: values.description,
        ...accountFields(values),
        isRecurringException: true,
      },
    }),
    prisma.recurringException.upsert({
      where: {
        recurringRuleId_occurrenceDate: {
          recurringRuleId: existing.recurringRuleId,
          occurrenceDate: existing.occurrenceDate,
        },
      },
      create: {
        recurringRuleId: existing.recurringRuleId,
        occurrenceDate: existing.occurrenceDate,
        action: "MODIFIED",
        transactionId: existing.id,
      },
      update: { action: "MODIFIED", transactionId: existing.id },
    }),
  ]);

  return redirectAccountId(values);
}

// "This and all future" edit: closes the old rule the day before this
// occurrence, deletes this and any later materialized rows under it
// (including any of their own individual "just this one" overrides — an
// explicit "change this and everything after" supersedes those), and opens
// a new rule from this occurrence with the edited values. Schedule
// (interval/end date) is carried over unchanged from the old rule — v1 does
// not support changing the recurrence cadence itself via edit.
export async function editFutureOccurrences(
  userId: string,
  existing: RecurringTransactionRef,
  values: TransactionInput
): Promise<string> {
  const oldRule = await prisma.recurringRule.findFirstOrThrow({
    where: { id: existing.recurringRuleId, userId },
  });

  const splitDate = existing.occurrenceDate;
  const dayBefore = subDayUTC(splitDate);

  const newRule = await prisma.$transaction(async (tx) => {
    await tx.recurringRule.update({
      where: { id: oldRule.id },
      data: { endDate: dayBefore, isActive: false },
    });

    await tx.transaction.deleteMany({
      where: { userId, recurringRuleId: oldRule.id, occurrenceDate: { gte: splitDate } },
    });

    return tx.recurringRule.create({
      data: {
        userId,
        type: values.type,
        amount: values.amount,
        description: values.description,
        ...accountFields(values),
        intervalCount: oldRule.intervalCount,
        intervalUnit: oldRule.intervalUnit,
        startDate: splitDate,
        endDate: oldRule.endDate,
        isActive: true,
        supersedesRuleId: oldRule.id,
      },
    });
  });

  await materializeRule(newRule);

  return redirectAccountId(values);
}

export async function deleteSingleOccurrence(existing: RecurringTransactionRef): Promise<void> {
  await prisma.$transaction([
    prisma.transaction.delete({ where: { id: existing.id } }),
    prisma.recurringException.upsert({
      where: {
        recurringRuleId_occurrenceDate: {
          recurringRuleId: existing.recurringRuleId,
          occurrenceDate: existing.occurrenceDate,
        },
      },
      create: {
        recurringRuleId: existing.recurringRuleId,
        occurrenceDate: existing.occurrenceDate,
        action: "SKIPPED",
      },
      update: { action: "SKIPPED", transactionId: null },
    }),
  ]);
}

export async function deleteFutureOccurrences(
  userId: string,
  existing: RecurringTransactionRef
): Promise<void> {
  const dayBefore = subDayUTC(existing.occurrenceDate);
  await prisma.$transaction([
    prisma.recurringRule.update({
      where: { id: existing.recurringRuleId },
      data: { endDate: dayBefore, isActive: false },
    }),
    prisma.transaction.deleteMany({
      where: { userId, recurringRuleId: existing.recurringRuleId, occurrenceDate: { gte: existing.occurrenceDate } },
    }),
  ]);
}

const UNIT_LABELS: Record<RecurrenceUnit, string> = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
};

export function describeSchedule(intervalCount: number, intervalUnit: RecurrenceUnit): string {
  const unit = UNIT_LABELS[intervalUnit];
  return intervalCount === 1 ? `Repeats every ${unit}` : `Repeats every ${intervalCount} ${unit}s`;
}
