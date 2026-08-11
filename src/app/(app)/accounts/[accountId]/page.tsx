import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants/accounts";
import { formatMoney } from "@/lib/services/format";
import { applyDelta, getAccountBalanceDeltas } from "@/lib/services/balance";
import {
  daysRemainingInMonth,
  isSameMonthUTC,
  monthLabel,
  monthParamString,
  monthRange,
  parseMonthParam,
  previousMonthEnd,
  shiftMonth,
} from "@/lib/services/calendar";
import { resolveAccountSettings } from "@/lib/services/settings";
import { DeleteAccountButton } from "@/components/accounts/DeleteAccountButton";
import { DeleteTransactionButton } from "@/components/transactions/DeleteTransactionButton";
import { ensureMaterialized } from "@/lib/services/recurrence";
import { addToBucket, sortedBuckets, type Bucket } from "@/lib/services/breakdown";
import { CategoryPieChart } from "@/components/charts/CategoryPieChart";

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const { accountId } = await params;
  const { month } = await searchParams;
  const monthKey = parseMonthParam(month);
  const { start, end } = monthRange(monthKey);
  const periodStartCutoff = previousMonthEnd(monthKey);

  await ensureMaterialized(userId, { through: end });

  const [account, profile, deltasAtStart, deltasAtEnd, monthTransactions] = await Promise.all([
    prisma.account.findFirst({ where: { id: accountId, userId } }),
    prisma.profile.findUniqueOrThrow({ where: { id: userId } }),
    getAccountBalanceDeltas(userId, { asOf: periodStartCutoff }),
    getAccountBalanceDeltas(userId, { asOf: end }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
        OR: [{ accountId }, { fromAccountId: accountId }, { toAccountId: accountId }],
      },
      orderBy: { date: "desc" },
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        tags: { include: { tag: true } },
      },
    }),
  ]);
  if (!account) notFound();

  const effectiveSettings = resolveAccountSettings(profile, account);

  // Spec 5.6: hides future-dated *rows* from the list only — it's a
  // declutter toggle, not a recalculation. Totals/balance/gauge stay
  // complete, since a future-dated transaction is still a real recorded
  // commitment (the whole balance model this session was built around
  // treating it that way). Only applies while viewing the actual current
  // month — browsing to a future month is an explicit choice to see it.
  const now = new Date();
  const todayDateOnly = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const hidingFuture = !effectiveSettings.showFutureTransactions && isSameMonthUTC(now, monthKey);
  const visibleTransactions = hidingFuture
    ? monthTransactions.filter((t) => t.date <= todayDateOnly)
    : monthTransactions;
  const hiddenFutureCount = monthTransactions.length - visibleTransactions.length;

  // Payoff projection is about "starting from where you are right now,"
  // not whichever historical/future month is being browsed elsewhere on
  // this page — so it's anchored to today's real balance, same reasoning
  // as Goals using today's real net worth rather than a viewed month's.
  let debtPayoffProjection: { owedToday: number; monthlyReduction: number; projectedDate: Date | null } | null =
    null;
  if (account.type === "CREDIT_CARD") {
    const now = new Date();
    const todayCutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const sixMonthsAgoCutoff = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, now.getUTCDate())
    );
    const [deltasToday, deltasSixMonthsAgo] = await Promise.all([
      getAccountBalanceDeltas(userId, { asOf: todayCutoff }),
      getAccountBalanceDeltas(userId, { asOf: sixMonthsAgoCutoff }),
    ]);
    const owedToday = Math.max(0, -applyDelta(account.id, deltasToday));
    if (owedToday > 0) {
      const owedSixMonthsAgo = Math.max(0, -applyDelta(account.id, deltasSixMonthsAgo));
      const monthlyReduction = (owedSixMonthsAgo - owedToday) / 6;
      const projectedDate =
        monthlyReduction > 0
          ? new Date(
              Date.UTC(
                todayCutoff.getUTCFullYear(),
                todayCutoff.getUTCMonth() + Math.ceil(owedToday / monthlyReduction),
                todayCutoff.getUTCDate()
              )
            )
          : null;
      debtPayoffProjection = { owedToday, monthlyReduction, projectedDate };
    }
  }

  const carryForward = applyDelta(account.id, deltasAtStart);
  const endingBalance = applyDelta(account.id, deltasAtEnd);
  const owed = Math.max(0, -endingBalance);
  const availableCredit =
    account.type === "CREDIT_CARD" && account.creditLimit
      ? Number(account.creditLimit) - owed
      : null;
  const creditUsedPercent =
    account.type === "CREDIT_CARD" && account.creditLimit && Number(account.creditLimit) > 0
      ? Math.min(100, (owed / Number(account.creditLimit)) * 100)
      : null;

  let income = 0;
  let expense = 0;
  let transferIn = 0;
  let transferOut = 0;
  const incomeByCategory = new Map<string, Bucket>();
  const expenseByCategory = new Map<string, Bucket>();
  const transferInByAccount = new Map<string, Bucket>();
  const transferOutByAccount = new Map<string, Bucket>();

  for (const t of monthTransactions) {
    const amt = Number(t.amount);
    if (t.type === "INCOME") {
      income += amt;
      addToBucket(
        incomeByCategory,
        t.isOpeningBalance ? "opening-balance" : (t.categoryId ?? "uncategorized"),
        t.isOpeningBalance ? "Opening Balance" : (t.category?.name ?? "Uncategorized"),
        t.isOpeningBalance ? "🏦" : (t.category?.icon ?? "❓"),
        amt
      );
    } else if (t.type === "EXPENSE") {
      expense += amt;
      addToBucket(
        expenseByCategory,
        t.isOpeningBalance ? "opening-balance" : (t.categoryId ?? "uncategorized"),
        t.isOpeningBalance ? "Opening Balance" : (t.category?.name ?? "Uncategorized"),
        t.isOpeningBalance ? "🏦" : (t.category?.icon ?? "❓"),
        amt
      );
    } else {
      if (t.toAccountId === accountId) {
        transferIn += amt;
        addToBucket(
          transferInByAccount,
          t.fromAccountId ?? "unknown",
          t.fromAccount?.name ?? "Unknown account",
          t.fromAccount?.icon ?? "🏦",
          amt
        );
      }
      if (t.fromAccountId === accountId) {
        transferOut += amt;
        addToBucket(
          transferOutByAccount,
          t.toAccountId ?? "unknown",
          t.toAccount?.name ?? "Unknown account",
          t.toAccount?.icon ?? "🏦",
          amt
        );
      }
    }
  }

  const totalIn = income + transferIn;
  const totalOut = expense + transferOut;
  // Carry Forward counts as available funds alongside this period's inflow —
  // it's money on hand from outside the month boundary, same as income.
  const availableFunds = carryForward + totalIn;
  const percentSpent = availableFunds > 0 ? (totalOut / availableFunds) * 100 : null;
  // "Left to Spend" must read the same as the pie's center figure — the
  // account's actual running balance (carry forward included), not just
  // this period's in/out — otherwise the two disagree the moment there's
  // any carry forward. For a credit card that's available credit against
  // the limit; for everything else it's the ending balance.
  const leftToSpend =
    account.type === "CREDIT_CARD" && account.creditLimit != null ? availableCredit! : endingBalance;

  // Only meaningful for a non-credit account while viewing the actual
  // current month — turns "₹9,350 left" into "₹425/day for the 22 days
  // left," a more directly actionable number for staying on budget.
  const daysRemaining = account.type === "CREDIT_CARD" ? null : daysRemainingInMonth(monthKey);
  const safeToSpendPerDay =
    daysRemaining !== null && leftToSpend >= 0 ? leftToSpend / daysRemaining : null;

  // A gauge, not a flow-ratio pie: total capacity is what this account had
  // available this period (Carry Forward + Total In), Used eats into it,
  // Available is what's left — exactly `leftToSpend`/`endingBalance`.
  // Category/counterpart-account detail for Income/Expense/Transfers still
  // lives in the Breakdown section below, unchanged.
  const cashFlowData = [
    { name: "Used", value: totalOut, color: "#ef4444" },
    { name: "Available", value: Math.max(0, availableFunds - totalOut), color: "#22c55e" },
  ].filter((d) => d.value > 0);

  // For a credit card, "this period's flow" isn't the useful thing to see
  // in the pie — a debt that carries over unpaid into a month with zero new
  // transactions would render as empty, hiding exactly the balance the user
  // cares about. Instead, scale the pie to the credit limit itself: Owed
  // eats into it, payments (which reduce endingBalance's negativity) grow
  // Available back — a gauge, not a flow breakdown, and it's never empty as
  // long as a limit is set.
  const isCreditGauge = account.type === "CREDIT_CARD" && account.creditLimit != null;
  const creditGaugeData = isCreditGauge
    ? [
        { name: "Owed", value: owed, color: "#ef4444" },
        {
          name: "Available Credit",
          value: Math.max(0, Number(account.creditLimit) - owed),
          color: "#7c3aed",
        },
      ].filter((d) => d.value > 0)
    : null;

  const pieData = creditGaugeData ?? cashFlowData;
  const pieCenterLabel = isCreditGauge ? "Available credit" : "Balance available";
  const pieCenterValue = isCreditGauge
    ? formatMoney(availableCredit!, account.currency)
    : formatMoney(endingBalance, account.currency);
  const pieCenterSubtext = isCreditGauge
    ? `${creditUsedPercent!.toFixed(0)}% used`
    : percentSpent !== null
      ? `${percentSpent.toFixed(0)}% spent`
      : undefined;

  const prevMonth = monthParamString(shiftMonth(monthKey, -1));
  const nextMonth = monthParamString(shiftMonth(monthKey, 1));

  const card = "rounded-2xl border border-border bg-surface p-5 shadow-sm";
  const cardHead = "mb-4 flex items-center justify-between";
  const cardTitle = "text-sm font-semibold text-fg";
  const link = "text-[12.5px] font-medium text-accent hover:underline";

  const breakdownSections = [
    { title: "Income by category", buckets: sortedBuckets(incomeByCategory), color: "text-success" },
    { title: "Expense by category", buckets: sortedBuckets(expenseByCategory), color: "text-danger" },
    { title: "Transfers in by account", buckets: sortedBuckets(transferInByAccount), color: "text-accent" },
    { title: "Transfers out by account", buckets: sortedBuckets(transferOutByAccount), color: "text-danger" },
  ].filter((section) => section.buckets.length > 0);

  return (
    <div className="mx-auto w-full max-w-[1400px] p-6 lg:p-10">
      <Link href="/accounts" className="text-sm font-medium text-fg-muted hover:underline">
        ← Back to Accounts
      </Link>

      <div className="mb-6 mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
            style={{ backgroundColor: account.color + "20" }}
          >
            {account.icon}
          </span>
          <div>
            <h1 className="text-xl font-semibold text-fg">{account.name}</h1>
            <p className="text-sm text-fg-muted">{ACCOUNT_TYPE_LABELS[account.type]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-full border border-border bg-surface p-1">
            <Link
              href={`/accounts/${account.id}?month=${prevMonth}`}
              aria-label="Previous month"
              className="flex h-7 w-7 items-center justify-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg"
            >
              ‹
            </Link>
            <span className="px-2.5 text-[13px] font-medium text-fg">{monthLabel(monthKey)}</span>
            <Link
              href={`/accounts/${account.id}?month=${nextMonth}`}
              aria-label="Next month"
              className="flex h-7 w-7 items-center justify-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg"
            >
              ›
            </Link>
          </div>
          <Link
            href={`/accounts/${account.id}/edit`}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2"
          >
            Edit
          </Link>
          <DeleteAccountButton accountId={account.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className={`${card} lg:col-span-5`}>
          <CategoryPieChart
            data={pieData}
            currency={account.currency}
            showDataLabels
            centerLabel={pieCenterLabel}
            centerValue={pieCenterValue}
            centerSubtext={pieCenterSubtext}
          />
          {!isCreditGauge && endingBalance < 0 && (
            <p className="mt-1 text-center text-xs font-medium text-danger">
              Overdrawn by {formatMoney(-endingBalance, account.currency)}
            </p>
          )}

          {account.type === "CREDIT_CARD" && account.creditLimit && (
            <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm text-fg-muted">
              <p>Credit limit: {formatMoney(Number(account.creditLimit), account.currency)}</p>
              <p>Available credit: {formatMoney(availableCredit!, account.currency)}</p>
              {owed > Number(account.creditLimit) && (
                <p className="text-xs font-medium text-danger">
                  Over limit by {formatMoney(owed - Number(account.creditLimit), account.currency)}
                </p>
              )}
            </div>
          )}

          {debtPayoffProjection && (
            <p className="mt-2 text-xs text-fg-muted">
              {debtPayoffProjection.projectedDate
                ? `At your trailing 6-month pace (${formatMoney(debtPayoffProjection.monthlyReduction, account.currency)}/mo), projected debt-free around ${debtPayoffProjection.projectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}.`
                : "Not currently trending toward payoff — balance isn't shrinking over the trailing 6 months."}
            </p>
          )}
        </section>

        <section className={`${card} lg:col-span-7`}>
          <div className={cardHead}>
            <h2 className={cardTitle}>This period</h2>
            <div className="flex gap-2">
              <Link
                href={`/transactions/new?type=INCOME&accountId=${account.id}`}
                className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-surface-2"
              >
                + Income
              </Link>
              <Link
                href={`/transactions/new?type=EXPENSE&accountId=${account.id}`}
                className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-surface-2"
              >
                + Expense
              </Link>
              <Link
                href={`/transactions/new?type=TRANSFER&accountId=${account.id}`}
                className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-surface-2"
              >
                + Transfer
              </Link>
            </div>
          </div>

          {effectiveSettings.budgetModeEnabled && account.monthlyBudget && (
            <div className="mb-4 rounded-xl bg-surface-2 p-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-fg">Budget Mode</span>
                <span
                  className={
                    totalOut > Number(account.monthlyBudget) ? "font-medium text-danger" : "text-fg-muted"
                  }
                >
                  {formatMoney(totalOut, account.currency)} of{" "}
                  {formatMoney(Number(account.monthlyBudget), account.currency)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className={`h-full ${totalOut > Number(account.monthlyBudget) ? "bg-danger" : "bg-accent"}`}
                  style={{ width: `${Math.min(100, (totalOut / Number(account.monthlyBudget)) * 100)}%` }}
                />
              </div>
              {totalOut > Number(account.monthlyBudget) && (
                <p className="mt-1 text-xs font-medium text-danger">
                  {formatMoney(totalOut - Number(account.monthlyBudget), account.currency)} over this
                  account&rsquo;s monthly budget
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-2 p-3.5">
              <p className="text-[11px] text-fg-muted">Carry forward</p>
              <p className="font-data mt-1.5 text-[17px] font-semibold tabular-nums text-fg">
                {formatMoney(carryForward, account.currency)}
              </p>
            </div>
            <div className="rounded-xl bg-surface-2 p-3.5">
              <p className="text-[11px] text-fg-muted">Total in</p>
              <p className="font-data mt-1.5 text-[17px] font-semibold tabular-nums text-success">
                +{formatMoney(totalIn, account.currency)}
              </p>
            </div>
            <div className="rounded-xl bg-surface-2 p-3.5">
              <p className="text-[11px] text-fg-muted">Total out</p>
              <p className="font-data mt-1.5 text-[17px] font-semibold tabular-nums text-danger">
                −{formatMoney(totalOut, account.currency)}
              </p>
            </div>
            <div className="rounded-xl bg-surface-2 p-3.5">
              <p className="text-[11px] text-fg-muted">Left to spend</p>
              <p
                className={`font-data mt-1.5 text-[17px] font-semibold tabular-nums ${leftToSpend >= 0 ? "text-success" : "text-danger"}`}
              >
                {formatMoney(leftToSpend, account.currency)}
              </p>
            </div>
          </div>

          {safeToSpendPerDay !== null && (
            <p className="mt-3 text-xs text-fg-muted">
              Safe to spend:{" "}
              <span className="font-data font-medium tabular-nums text-fg">
                {formatMoney(safeToSpendPerDay, account.currency)}/day
              </span>{" "}
              ({daysRemaining} days left)
            </p>
          )}
        </section>

        {breakdownSections.length > 0 && (
          <section className={`${card} lg:col-span-5`}>
            <div className={cardHead}>
              <h2 className={cardTitle}>Breakdown</h2>
              <Link href={`/transactions?accountId=${account.id}`} className={link}>
                Full history
              </Link>
            </div>
            {breakdownSections.map((section, i) => (
              <div key={section.title} className={i > 0 ? "mt-4" : ""}>
                <p className="text-xs font-medium text-fg-muted">{section.title}</p>
                <ul className="mt-1 space-y-1">
                  {section.buckets.map((b) => (
                    <li key={b.key} className="flex items-center justify-between text-sm">
                      <span className="text-fg">
                        {b.icon} {b.name}
                      </span>
                      <span className={`font-data font-medium tabular-nums ${section.color}`}>
                        {formatMoney(b.total, account.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        <section className={`${card} ${breakdownSections.length > 0 ? "lg:col-span-7" : "lg:col-span-12"}`}>
          <div className={cardHead}>
            <h2 className={cardTitle}>{monthLabel(monthKey)} transactions</h2>
          </div>
          {hiddenFutureCount > 0 && (
            <p className="mb-3 text-xs text-fg-muted">
              {hiddenFutureCount} upcoming transaction{hiddenFutureCount === 1 ? "" : "s"} hidden —{" "}
              <Link href="/settings" className="hover:underline">
                Show Future Transactions is off
              </Link>
              .
            </p>
          )}

          {visibleTransactions.length === 0 ? (
            <p className="text-sm text-fg-muted">No transactions this month.</p>
          ) : (
            <ul>
              {visibleTransactions.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between border-t border-border py-2.5 first:border-t-0"
                >
                  <div>
                    <p className="text-[13.5px] font-medium text-fg">
                      {t.isOpeningBalance
                        ? "🏦 Opening balance"
                        : t.type === "TRANSFER"
                          ? `${t.fromAccount?.name} → ${t.toAccount?.name}`
                          : (t.category?.name ?? "Uncategorized")}
                    </p>
                    <p className="text-[11.5px] text-fg-subtle">
                      {t.date.toISOString().slice(0, 10)}
                      {t.recurringRuleId ? " · 🔁" : ""}
                    </p>
                    {t.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {t.tags.map(({ tag }) => (
                          <Link
                            key={tag.id}
                            href={`/tags/${encodeURIComponent(tag.name)}`}
                            className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg-muted hover:bg-surface-3"
                          >
                            🏷️ {tag.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <p
                      className={`font-data text-[13.5px] font-semibold tabular-nums ${
                        t.type === "INCOME"
                          ? "text-success"
                          : t.type === "EXPENSE"
                            ? "text-danger"
                            : "text-fg"
                      }`}
                    >
                      {t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "−" : ""}
                      {formatMoney(Number(t.amount), account.currency)}
                    </p>
                    {t.isOpeningBalance ? (
                      <Link
                        href={`/accounts/${account.id}/edit`}
                        className="text-xs font-medium text-fg-muted hover:underline"
                      >
                        Edit account
                      </Link>
                    ) : (
                      <>
                        <Link
                          href={`/transactions/new?duplicateId=${t.id}`}
                          className="text-xs font-medium text-fg-muted hover:underline"
                        >
                          Duplicate
                        </Link>
                        <Link
                          href={`/transactions/${t.id}/edit`}
                          className="text-xs font-medium text-fg-muted hover:underline"
                        >
                          Edit
                        </Link>
                        <DeleteTransactionButton
                          transactionId={t.id}
                          redirectTo={`/accounts/${account.id}?month=${monthParamString(monthKey)}`}
                          isRecurring={!!t.recurringRuleId}
                        />
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
