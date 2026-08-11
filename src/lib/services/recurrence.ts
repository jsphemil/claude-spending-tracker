import { prisma } from "@/lib/db/prisma";
import type { RecurrenceUnit, RecurringRule } from "@/generated/prisma/client";
import type { TransactionInput } from "@/lib/validation/transaction";
import { syncTransactionTags } from "@/lib/services/tags";

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

// The rolling today+3-month horizon is only a baseline — a page browsing
// further out (e.g. the Dashboard/Account month nav pushed past it) must be
// able to pull materialization out further too, or an indefinite recurring
// rule would just stop appearing past that point despite having no end
// date. `through` extends the horizon to cover whichever date the caller
// actually needs, never shrinks it.
function effectiveHorizon(through?: Date): Date {
  const base = horizonDate();
  return through && through > base ? through : base;
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
async function materializeRule(rule: RecurringRule, horizon: Date): Promise<void> {
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

  const ruleTags = await prisma.recurringRuleTag.findMany({
    where: { recurringRuleId: rule.id },
    select: { tagId: true },
  });
  if (ruleTags.length > 0) {
    const createdRows = await prisma.transaction.findMany({
      where: { recurringRuleId: rule.id, occurrenceDate: { in: occurrences } },
      select: { id: true },
    });
    await prisma.transactionTag.createMany({
      data: createdRows.flatMap((row) =>
        ruleTags.map((rt) => ({ transactionId: row.id, tagId: rt.tagId }))
      ),
      skipDuplicates: true,
    });
  }

  await prisma.recurringRule.update({
    where: { id: rule.id },
    data: { lastGeneratedDate: occurrences[occurrences.length - 1] },
  });
}

// Primary materialization mechanism — call at the top of any page that reads
// transaction data, passing `through` when that page is viewing a specific
// date range (e.g. the month currently being browsed) so an indefinite rule
// keeps materializing as far as the user actually navigates, not just
// today+3 months. The daily cron (/api/cron/materialize-recurring) is only
// a backstop for when nobody visits the app.
export async function ensureMaterialized(userId: string, opts?: { through?: Date }): Promise<void> {
  const horizon = effectiveHorizon(opts?.through);
  const rules = await prisma.recurringRule.findMany({
    where: { userId, isActive: true, startDate: { lte: horizon } },
  });
  // Independent rules — no shared state between them — so materialize
  // concurrently rather than one round-trip at a time.
  await Promise.all(rules.map((rule) => materializeRule(rule, horizon)));
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
  schedule: { intervalCount: number; intervalUnit: RecurrenceUnit; endDate: Date | null },
  tagIds: string[] = []
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

  if (tagIds.length > 0) {
    await prisma.recurringRuleTag.createMany({
      data: tagIds.map((tagId) => ({ recurringRuleId: rule.id, tagId })),
      skipDuplicates: true,
    });
  }

  await materializeRule(rule, horizonDate());

  return redirectAccountId(values);
}

type RecurringTransactionRef = { id: string; recurringRuleId: string; occurrenceDate: Date };

// "Just this one" edit: `date` can diverge from `occurrenceDate` (the
// schedule's anchor for this slot never changes — see the Transaction model
// comment) — e.g. a salary that's normally on the 1st but landed on the 3rd
// this month. occurrenceDate stays put so the series and its exception
// record still line up.
export async function editSingleOccurrence(
  existing: RecurringTransactionRef,
  values: TransactionInput,
  tagIds: string[] = []
): Promise<string> {
  await prisma.$transaction([
    prisma.transaction.update({
      where: { id: existing.id },
      data: {
        type: values.type,
        amount: values.amount,
        date: values.date,
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

  await syncTransactionTags(existing.id, tagIds);

  return redirectAccountId(values);
}

// "This and all future" edit: closes the old rule the day before this
// occurrence, deletes this and any later materialized rows under it
// (including any of their own individual "just this one" overrides — an
// explicit "change this and everything after" supersedes those), and opens
// a new rule anchored on the edited date with the edited values — so moving
// the date here reschedules this and every future occurrence (e.g. a salary
// date shifting from the 1st to the 5th going forward). Interval (the
// repeat cadence) is still carried over unchanged from the old rule — v1
// doesn't support changing that via edit — but the end date is: `newEndDate`
// lets the caller set/clear it (undefined keeps the old rule's end date,
// for callers that don't offer the field at all).
export async function editFutureOccurrences(
  userId: string,
  existing: RecurringTransactionRef,
  values: TransactionInput,
  tagIds: string[] = [],
  newEndDate?: Date | null
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

    const created = await tx.recurringRule.create({
      data: {
        userId,
        type: values.type,
        amount: values.amount,
        description: values.description,
        ...accountFields(values),
        intervalCount: oldRule.intervalCount,
        intervalUnit: oldRule.intervalUnit,
        startDate: values.date,
        endDate: newEndDate !== undefined ? newEndDate : oldRule.endDate,
        isActive: true,
        supersedesRuleId: oldRule.id,
      },
    });

    if (tagIds.length > 0) {
      await tx.recurringRuleTag.createMany({
        data: tagIds.map((tagId) => ({ recurringRuleId: created.id, tagId })),
        skipDuplicates: true,
      });
    }

    return created;
  });

  await materializeRule(newRule, horizonDate());

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

// Normalizes any cadence to a monthly figure so a weekly ₹500 charge and a
// yearly ₹6,000 one can be summed into one meaningful "commitments per
// month" total. Average month/week length (365.25/12 days), not a fixed
// 30 — keeps a weekly rule's monthly-equivalent stable regardless of which
// month you'd otherwise divide by.
const AVG_DAYS_PER_MONTH = 365.25 / 12;
const AVG_WEEKS_PER_MONTH = AVG_DAYS_PER_MONTH / 7;

export function monthlyEquivalent(
  amount: number,
  intervalCount: number,
  intervalUnit: RecurrenceUnit
): number {
  switch (intervalUnit) {
    case "DAY":
      return (amount * AVG_DAYS_PER_MONTH) / intervalCount;
    case "WEEK":
      return (amount * AVG_WEEKS_PER_MONTH) / intervalCount;
    case "MONTH":
      return amount / intervalCount;
    case "YEAR":
      return amount / (12 * intervalCount);
  }
}
