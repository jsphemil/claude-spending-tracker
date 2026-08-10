import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/services/format";
import { getNetWorthSeries } from "@/lib/services/balance";
import { DeleteGoalButton } from "@/components/goals/DeleteGoalButton";

// Six months back is enough signal for a trailing growth rate without
// over-weighting a single unusual month, and matches what a user browsing
// the Dashboard's 12-month trend chart can already sanity-check by eye.
const TRAILING_MONTHS = 6;

export default async function GoalsPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/login");

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - TRAILING_MONTHS, now.getUTCDate()));

  const [goals, [netWorthPast, netWorthNow]] = await Promise.all([
    prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    getNetWorthSeries(userId, [sixMonthsAgo, today]),
  ]);

  const monthlyGrowth = (netWorthNow - netWorthPast) / TRAILING_MONTHS;

  const rows = goals.map((goal) => {
    const target = Number(goal.targetAmount);
    const remaining = target - netWorthNow;
    const percent = Math.min(100, Math.max(0, (netWorthNow / target) * 100));
    const reached = netWorthNow >= target;

    let projectedDate: Date | null = null;
    if (!reached && monthlyGrowth > 0) {
      const monthsToGoal = remaining / monthlyGrowth;
      projectedDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + Math.ceil(monthsToGoal), today.getUTCDate()));
    }

    const isBehindTarget =
      goal.targetDate !== null && projectedDate !== null && projectedDate > goal.targetDate;

    return { goal, target, remaining, percent, reached, projectedDate, isBehindTarget };
  });

  return (
    <div className="max-w-md p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-fg">Goals</h1>
        <Link
          href="/goals/new"
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-strong"
        >
          + New Goal
        </Link>
      </div>
      <p className="mt-1 text-sm text-fg-muted">
        Tracked against net worth. Projected dates use your trailing {TRAILING_MONTHS}-month growth rate
        ({formatMoney(monthlyGrowth, "INR")}/mo).
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-fg-muted">
          No goals yet. Set a net worth target to start tracking progress.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map(({ goal, target, remaining, percent, reached, projectedDate, isBehindTarget }) => (
            <li key={goal.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-fg">{goal.name}</p>
                <p className="text-sm font-medium text-fg">{formatMoney(target, "INR")}</p>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
                <div
                  className={`h-full ${reached ? "bg-success" : "bg-accent"}`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-fg-muted">
                <span>{percent.toFixed(0)}% there</span>
                {reached ? (
                  <span className="font-medium text-success">🎉 Goal reached</span>
                ) : (
                  <span>{formatMoney(remaining, "INR")} to go</span>
                )}
              </div>

              {!reached && (
                <p className="mt-1 text-xs text-fg-muted">
                  {projectedDate
                    ? `At current pace, projected around ${projectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}`
                    : "Not currently trending toward this goal"}
                  {goal.targetDate && (
                    <>
                      {" "}
                      · target{" "}
                      {goal.targetDate.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
                    </>
                  )}
                </p>
              )}
              {isBehindTarget && (
                <p className="mt-1 text-xs font-medium text-danger">Behind pace for your target date</p>
              )}

              <div className="mt-3 flex items-center gap-3">
                <Link
                  href={`/goals/${goal.id}/edit`}
                  className="text-xs font-medium text-fg-muted hover:underline"
                >
                  Edit
                </Link>
                <DeleteGoalButton goalId={goal.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
